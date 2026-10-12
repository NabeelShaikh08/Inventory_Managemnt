from django.utils import timezone
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Product, StockRequest, RequestLine
from .serializers import (
    CategorySerializer, ProductSerializer,
    MeSerializer, StockRequestSerializer, StockRequestListSerializer,
    DecideRequestSerializer,
)
from .filters import ProductFilter
from .permissions import IsMaker, IsCheckerOrSuperAdmin, IsSuperAdmin


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'category__name']
    ordering_fields = ['name', 'price', 'stock', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        active_param = self.request.query_params.get('active_only')
        if active_param and active_param.lower() == 'true':
            queryset = queryset.filter(is_active=True)
        return queryset


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)


class StockRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ('list',):
            return StockRequestListSerializer
        return StockRequestSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(getattr(user, 'profile', None), 'role', None)
        qs = StockRequest.objects.select_related(
            'created_by', 'decided_by'
        ).prefetch_related('lines__product', 'lines__proposed_category')
        if role == 'maker':
            return qs.filter(created_by=user)
        # checker and superadmin see all
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_permissions(self):
        if self.action == 'create':
            return [IsMaker()]
        if self.action == 'decide':
            return [IsCheckerOrSuperAdmin()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'], url_path='withdraw')
    def withdraw(self, request, pk=None):
        stock_request = self.get_object()
        if stock_request.created_by != request.user:
            return Response(
                {'detail': 'You can only withdraw your own requests.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        if stock_request.status != 'pending':
            return Response(
                {'detail': 'Only pending requests can be withdrawn.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stock_request.status = 'withdrawn'
        stock_request.save()
        return Response(StockRequestSerializer(stock_request).data)

    @action(detail=True, methods=['post'], url_path='decide')
    def decide(self, request, pk=None):
        stock_request = self.get_object()

        # Four-eyes: checker cannot decide their own request
        if stock_request.created_by == request.user:
            return Response(
                {'detail': 'You cannot decide on your own request.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if stock_request.status != 'pending':
            return Response(
                {'detail': 'Only pending requests can be decided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DecideRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decisions = {d['line_id']: d for d in serializer.validated_data['lines']}
        remarks = serializer.validated_data.get('remarks', '')

        lines = list(stock_request.lines.all())
        line_ids = {line.id for line in lines}
        for lid in decisions:
            if lid not in line_ids:
                return Response(
                    {'detail': f'Line {lid} does not belong to this request.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Apply per-line decisions and execute approved actions
        approved_count = 0
        rejected_count = 0
        for line in lines:
            dec = decisions.get(line.id)
            if dec is None:
                continue
            line.line_status = dec['decision']
            if dec['decision'] == 'rejected':
                line.rejection_reason = dec.get('rejection_reason', '')
                rejected_count += 1
            else:
                approved_count += 1
                self._apply_line(line)
            line.save()

        # Set header-level status
        all_decided = approved_count + rejected_count == len(lines)
        if all_decided:
            if rejected_count == 0:
                stock_request.status = 'approved'
            elif approved_count == 0:
                stock_request.status = 'rejected'
            else:
                stock_request.status = 'partially_approved'
        else:
            stock_request.status = 'partially_approved'

        stock_request.decided_by = request.user
        stock_request.decided_at = timezone.now()
        if remarks:
            stock_request.remarks = remarks
        stock_request.save()

        return Response(StockRequestSerializer(stock_request).data)

    def _apply_line(self, line):
        if line.action == 'stock_in' and line.product and line.quantity:
            line.product.stock += int(line.quantity)
            line.product.save()
        elif line.action == 'new_product':
            from .models import Product as P
            category = line.proposed_category
            if category is None and line.product:
                category = line.product.category
            P.objects.create(
                name=line.proposed_name or 'Unnamed Product',
                description=line.proposed_description or '',
                price=line.proposed_price or 0,
                stock=line.proposed_stock or 0,
                category=category,
                is_active=True,
            )
        elif line.action == 'edit_product' and line.product:
            p = line.product
            if line.proposed_name:
                p.name = line.proposed_name
            if line.proposed_price is not None:
                p.price = line.proposed_price
            if line.proposed_stock is not None:
                p.stock = line.proposed_stock
            if line.proposed_category:
                p.category = line.proposed_category
            if line.proposed_description:
                p.description = line.proposed_description
            p.save()
