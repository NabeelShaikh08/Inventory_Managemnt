from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Product, UserProfile, StockRequest, RequestLine


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'code', 'product_count']

    def get_product_count(self, obj):
        return obj.products.filter(is_active=True).count()


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'stock',
            'category', 'category_name', 'category_code',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Price must be greater than 0.')
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return value


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'role']


class MeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']


class RequestLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    proposed_category_name = serializers.CharField(
        source='proposed_category.name', read_only=True
    )

    class Meta:
        model = RequestLine
        fields = [
            'id', 'action',
            'product', 'product_name',
            'quantity', 'unit_cost', 'supplier',
            'proposed_name', 'proposed_price', 'proposed_stock',
            'proposed_category', 'proposed_category_name', 'proposed_description',
            'uom', 'proposed_uom', 'warehouse_code',
            'subcategory', 'proposed_subcategory',
            'min_stock', 'proposed_min_stock',
            'reorder_level', 'proposed_reorder_level',
            'barcode',
            'line_status', 'rejection_reason',
        ]
        read_only_fields = ['line_status', 'rejection_reason']

    def validate(self, data):
        action = data.get('action')
        if action == 'stock_in':
            if not data.get('product'):
                raise serializers.ValidationError({'product': 'Required for stock_in.'})
            if not data.get('quantity') or data['quantity'] <= 0:
                raise serializers.ValidationError({'quantity': 'Must be > 0 for stock_in.'})
        elif action in ('new_product', 'edit_product'):
            if action == 'edit_product' and not data.get('product'):
                raise serializers.ValidationError({'product': 'Required for edit_product.'})
            if not data.get('proposed_name') and action == 'new_product':
                raise serializers.ValidationError({'proposed_name': 'Required for new_product.'})
        return data


class StockRequestSerializer(serializers.ModelSerializer):
    lines = RequestLineSerializer(many=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    decided_by_username = serializers.CharField(
        source='decided_by.username', read_only=True, default=None
    )

    class Meta:
        model = StockRequest
        fields = [
            'id', 'status', 'document_ref', 'remarks',
            'created_by', 'created_by_username',
            'decided_by', 'decided_by_username',
            'created_at', 'decided_at',
            'lines',
        ]
        read_only_fields = [
            'status', 'created_by', 'decided_by', 'created_at', 'decided_at',
        ]

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request_obj = StockRequest.objects.create(**validated_data)
        for line in lines_data:
            RequestLine.objects.create(request=request_obj, **line)
        return request_obj


class StockRequestListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    decided_by_username = serializers.CharField(
        source='decided_by.username', read_only=True, default=None
    )
    line_count = serializers.IntegerField(source='lines.count', read_only=True)

    class Meta:
        model = StockRequest
        fields = [
            'id', 'status', 'document_ref', 'remarks',
            'created_by', 'created_by_username',
            'decided_by', 'decided_by_username',
            'created_at', 'decided_at', 'line_count',
        ]


class DecideLineSerializer(serializers.Serializer):
    line_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=['approved', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')


class DecideRequestSerializer(serializers.Serializer):
    lines = DecideLineSerializer(many=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')
