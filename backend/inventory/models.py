from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, blank=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('maker', 'Maker'),
        ('checker', 'Checker'),
        ('superadmin', 'SuperAdmin'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='maker')

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class StockRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('partially_approved', 'Partially Approved'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='requests_created')
    decided_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.PROTECT, related_name='requests_decided'
    )
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='pending')
    document_ref = models.CharField(max_length=255, blank=True)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    decided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"REQ-{self.pk:04d} ({self.status})"


class RequestLine(models.Model):
    ACTION_CHOICES = [
        ('stock_in', 'Stock In'),
        ('new_product', 'New Product'),
        ('edit_product', 'Edit Product'),
    ]
    LINE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    request = models.ForeignKey(StockRequest, on_delete=models.CASCADE, related_name='lines')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.PROTECT)
    # For stock_in
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    supplier = models.CharField(max_length=255, blank=True)
    # For new_product / edit_product
    proposed_name = models.CharField(max_length=255, blank=True)
    proposed_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    proposed_stock = models.PositiveIntegerField(null=True, blank=True)
    proposed_category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.PROTECT, related_name='proposed_lines'
    )
    proposed_description = models.TextField(blank=True)
    # Extended fields
    uom = models.CharField(max_length=20, blank=True)
    proposed_uom = models.CharField(max_length=20, blank=True)
    warehouse_code = models.CharField(max_length=50, default='MAIN-WH')
    subcategory = models.CharField(max_length=100, blank=True)
    proposed_subcategory = models.CharField(max_length=100, blank=True)
    min_stock = models.PositiveIntegerField(null=True, blank=True)
    proposed_min_stock = models.PositiveIntegerField(null=True, blank=True)
    reorder_level = models.PositiveIntegerField(null=True, blank=True)
    proposed_reorder_level = models.PositiveIntegerField(null=True, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    # Decision
    line_status = models.CharField(max_length=20, choices=LINE_STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['id']
