import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Category, Product


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username='testuser', password='Test@1234')


@pytest.fixture
def auth_client(api_client, user):
    response = api_client.post('/api/auth/login/', {'username': 'testuser', 'password': 'Test@1234'})
    token = response.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return api_client


@pytest.fixture
def category(db):
    return Category.objects.create(name='Cement & Concrete', code='CEM')


@pytest.fixture
def product(db, category):
    return Product.objects.create(
        name='Ordinary Portland Cement 50 kg',
        description='OPC Grade 53',
        price='17.50',
        stock=100,
        category=category,
    )


class TestAuthentication:
    def test_login_with_valid_credentials(self, api_client, user):
        response = api_client.post('/api/auth/login/', {'username': 'testuser', 'password': 'Test@1234'})
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_with_invalid_credentials(self, api_client, user):
        response = api_client.post('/api/auth/login/', {'username': 'testuser', 'password': 'wrongpass'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_request_is_rejected(self, api_client):
        response = api_client.get('/api/products/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestCategories:
    def test_list_categories(self, auth_client, category):
        response = auth_client.get('/api/categories/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_category_has_product_count(self, auth_client, category, product):
        response = auth_client.get('/api/categories/')
        cat = next(c for c in response.data if c['id'] == category.id)
        assert cat['product_count'] == 1


class TestProducts:
    def test_list_products(self, auth_client, product):
        response = auth_client.get('/api/products/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_create_product(self, auth_client, category):
        data = {
            'name': 'Sulphate Resistant Cement 50 kg',
            'description': 'SRC for sulphate-rich soil',
            'price': '19.00',
            'stock': 200,
            'category': category.id,
            'is_active': True,
        }
        response = auth_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == data['name']

    def test_retrieve_product(self, auth_client, product):
        response = auth_client.get(f'/api/products/{product.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == product.name

    def test_update_product(self, auth_client, product):
        response = auth_client.patch(f'/api/products/{product.id}/', {'stock': 999})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['stock'] == 999

    def test_delete_product(self, auth_client, product):
        response = auth_client.delete(f'/api/products/{product.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Product.objects.filter(id=product.id).exists()

    def test_search_products_by_name(self, auth_client, product):
        response = auth_client.get('/api/products/?search=Portland')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_filter_products_by_category(self, auth_client, product, category):
        response = auth_client.get(f'/api/products/?category={category.id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_pagination_returns_correct_structure(self, auth_client, product):
        response = auth_client.get('/api/products/')
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert 'results' in response.data


class TestValidation:
    def test_price_must_be_greater_than_zero(self, auth_client, category):
        data = {'name': 'Test Item', 'price': '0.00', 'stock': 10, 'category': category.id}
        response = auth_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'price' in response.data

    def test_negative_price_is_rejected(self, auth_client, category):
        data = {'name': 'Test Item', 'price': '-5.00', 'stock': 10, 'category': category.id}
        response = auth_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_negative_stock_is_rejected(self, auth_client, category):
        data = {'name': 'Test Item', 'price': '10.00', 'stock': -1, 'category': category.id}
        response = auth_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'stock' in response.data

    def test_name_is_required(self, auth_client, category):
        data = {'price': '10.00', 'stock': 5, 'category': category.id}
        response = auth_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in response.data
