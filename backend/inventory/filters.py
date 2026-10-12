import django_filters
from .models import Product


class ProductFilter(django_filters.FilterSet):
    category = django_filters.NumberFilter(field_name='category__id')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')

    class Meta:
        model = Product
        fields = ['category', 'is_active', 'min_price', 'max_price']
