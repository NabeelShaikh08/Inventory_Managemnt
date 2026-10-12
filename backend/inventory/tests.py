import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import Category, Product, UserProfile, StockRequest, RequestLine


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


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


def _make_user(username, role):
    user = User.objects.create_user(username=username, password='Test@1234')
    UserProfile.objects.create(user=user, role=role)
    return user


@pytest.fixture
def maker(db):
    return _make_user('maker_user', 'maker')


@pytest.fixture
def checker(db):
    return _make_user('checker_user', 'checker')


@pytest.fixture
def superadmin(db):
    return _make_user('admin_user', 'superadmin')


def _auth(api_client, user):
    response = api_client.post('/api/auth/login/', {'username': user.username, 'password': 'Test@1234'})
    assert response.status_code == 200, f"Login failed for {user.username}: {response.data}"
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {response.data["access"]}')
    return api_client


@pytest.fixture
def maker_client(api_client, maker):
    return _auth(api_client, maker)


@pytest.fixture
def checker_client(db, checker):
    client = APIClient()
    return _auth(client, checker)


@pytest.fixture
def admin_client(db, superadmin):
    client = APIClient()
    return _auth(client, superadmin)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

class TestAuthentication:
    def test_login_with_valid_credentials(self, api_client, maker):
        response = api_client.post('/api/auth/login/', {'username': 'maker_user', 'password': 'Test@1234'})
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_with_invalid_credentials(self, api_client, maker):
        response = api_client.post('/api/auth/login/', {'username': 'maker_user', 'password': 'wrongpass'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unauthenticated_request_is_rejected(self, api_client):
        response = api_client.get('/api/products/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_endpoint_returns_role(self, maker_client):
        response = maker_client.get('/api/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['role'] == 'maker'
        assert response.data['username'] == 'maker_user'


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

class TestCategories:
    def test_list_categories(self, maker_client, category):
        response = maker_client.get('/api/categories/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_category_has_product_count(self, maker_client, category, product):
        response = maker_client.get('/api/categories/')
        cat = next(c for c in response.data if c['id'] == category.id)
        assert cat['product_count'] == 1


# ---------------------------------------------------------------------------
# Products — CRUD
# ---------------------------------------------------------------------------

class TestProducts:
    def test_list_products(self, maker_client, product):
        response = maker_client.get('/api/products/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_create_product(self, maker_client, category):
        data = {
            'name': 'Sulphate Resistant Cement 50 kg',
            'description': 'SRC for sulphate-rich soil',
            'price': '19.00',
            'stock': 200,
            'category': category.id,
            'is_active': True,
        }
        response = maker_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == data['name']

    def test_retrieve_product(self, maker_client, product):
        response = maker_client.get(f'/api/products/{product.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == product.name

    def test_update_product(self, maker_client, product):
        response = maker_client.patch(f'/api/products/{product.id}/', {'stock': 999})
        assert response.status_code == status.HTTP_200_OK
        assert response.data['stock'] == 999

    def test_delete_product(self, maker_client, product):
        response = maker_client.delete(f'/api/products/{product.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Product.objects.filter(id=product.id).exists()

    def test_search_products_by_name(self, maker_client, product):
        response = maker_client.get('/api/products/?search=Portland')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_filter_products_by_category(self, maker_client, product, category):
        response = maker_client.get(f'/api/products/?category={category.id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 1

    def test_pagination_returns_correct_structure(self, maker_client, product):
        response = maker_client.get('/api/products/')
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert 'results' in response.data

    def test_ordering_by_price(self, maker_client, category):
        Product.objects.create(name='Cheap Item', price='5.00', stock=10, category=category)
        Product.objects.create(name='Expensive Item', price='500.00', stock=10, category=category)
        response = maker_client.get('/api/products/?ordering=price')
        assert response.status_code == status.HTTP_200_OK
        prices = [float(p['price']) for p in response.data['results']]
        assert prices == sorted(prices)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class TestValidation:
    def test_price_must_be_greater_than_zero(self, maker_client, category):
        data = {'name': 'Test Item', 'price': '0.00', 'stock': 10, 'category': category.id}
        response = maker_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'price' in response.data

    def test_negative_price_is_rejected(self, maker_client, category):
        data = {'name': 'Test Item', 'price': '-5.00', 'stock': 10, 'category': category.id}
        response = maker_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_negative_stock_is_rejected(self, maker_client, category):
        data = {'name': 'Test Item', 'price': '10.00', 'stock': -1, 'category': category.id}
        response = maker_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'stock' in response.data

    def test_name_is_required(self, maker_client, category):
        data = {'price': '10.00', 'stock': 5, 'category': category.id}
        response = maker_client.post('/api/products/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in response.data


# ---------------------------------------------------------------------------
# Stock Requests — Maker workflow
# ---------------------------------------------------------------------------

class TestStockRequests:
    def test_maker_can_create_request(self, maker_client, product):
        data = {
            'document_ref': 'PO-2026-001',
            'remarks': 'Urgent restock',
            'lines': [{'action': 'stock_in', 'product': product.id, 'quantity': '50', 'unit_cost': '17.50'}],
        }
        response = maker_client.post('/api/requests/', data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['status'] == 'pending'
        assert len(response.data['lines']) == 1

    def test_maker_sees_only_own_requests(self, db, maker, product):
        other = _make_user('other_maker', 'maker')
        maker_client = _auth(APIClient(), maker)
        other_client = _auth(APIClient(), other)

        maker_client.post('/api/requests/', {
            'lines': [{'action': 'stock_in', 'product': product.id, 'quantity': '10'}],
        }, format='json')
        other_client.post('/api/requests/', {
            'lines': [{'action': 'stock_in', 'product': product.id, 'quantity': '5'}],
        }, format='json')

        response = maker_client.get('/api/requests/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1

    def test_maker_can_withdraw_own_pending_request(self, maker_client, maker, product):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        RequestLine.objects.create(request=req, action='stock_in', product=product, quantity=10)
        response = maker_client.post(f'/api/requests/{req.id}/withdraw/')
        assert response.status_code == status.HTTP_200_OK
        req.refresh_from_db()
        assert req.status == 'withdrawn'

    def test_checker_cannot_submit_request(self, checker_client, product):
        data = {
            'lines': [{'action': 'stock_in', 'product': product.id, 'quantity': '10'}],
        }
        response = checker_client.post('/api/requests/', data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ---------------------------------------------------------------------------
# Stock Requests — Checker approval workflow
# ---------------------------------------------------------------------------

class TestApprovalWorkflow:
    def test_checker_can_approve_stock_in(self, checker_client, checker, maker, product):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line = RequestLine.objects.create(
            request=req, action='stock_in', product=product, quantity=50
        )
        original_stock = product.stock

        response = checker_client.post(f'/api/requests/{req.id}/decide/', {
            'remarks': 'Approved',
            'lines': [{'line_id': line.id, 'decision': 'approved'}],
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        req.refresh_from_db()
        product.refresh_from_db()
        assert req.status == 'approved'
        assert product.stock == original_stock + 50

    def test_checker_can_reject_line(self, checker_client, checker, maker, product):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line = RequestLine.objects.create(
            request=req, action='stock_in', product=product, quantity=50
        )
        response = checker_client.post(f'/api/requests/{req.id}/decide/', {
            'lines': [{'line_id': line.id, 'decision': 'rejected', 'rejection_reason': 'Budget exceeded'}],
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        req.refresh_from_db()
        assert req.status == 'rejected'
        line.refresh_from_db()
        assert line.rejection_reason == 'Budget exceeded'

    def test_four_eyes_rule_maker_cannot_decide_own_request(self, maker_client, maker, product):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line = RequestLine.objects.create(
            request=req, action='stock_in', product=product, quantity=10
        )
        response = maker_client.post(f'/api/requests/{req.id}/decide/', {
            'lines': [{'line_id': line.id, 'decision': 'approved'}],
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_new_product_approval_creates_product(self, checker_client, checker, maker, category):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line = RequestLine.objects.create(
            request=req,
            action='new_product',
            proposed_name='New Rebar 12mm',
            proposed_price='9.50',
            proposed_stock=200,
            proposed_category=category,
        )
        count_before = Product.objects.count()

        response = checker_client.post(f'/api/requests/{req.id}/decide/', {
            'lines': [{'line_id': line.id, 'decision': 'approved'}],
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert Product.objects.count() == count_before + 1
        assert Product.objects.filter(name='New Rebar 12mm').exists()

    def test_partial_approval_sets_correct_status(self, checker_client, checker, maker, product, category):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line1 = RequestLine.objects.create(
            request=req, action='stock_in', product=product, quantity=10
        )
        line2 = RequestLine.objects.create(
            request=req,
            action='new_product',
            proposed_name='Partial Item',
            proposed_price='5.00',
            proposed_stock=10,
            proposed_category=category,
        )
        response = checker_client.post(f'/api/requests/{req.id}/decide/', {
            'lines': [
                {'line_id': line1.id, 'decision': 'approved'},
                {'line_id': line2.id, 'decision': 'rejected', 'rejection_reason': 'Not needed'},
            ],
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        req.refresh_from_db()
        assert req.status == 'partially_approved'

    def test_superadmin_can_decide_requests(self, admin_client, maker, product):
        req = StockRequest.objects.create(created_by=maker, status='pending')
        line = RequestLine.objects.create(
            request=req, action='stock_in', product=product, quantity=5
        )
        response = admin_client.post(f'/api/requests/{req.id}/decide/', {
            'lines': [{'line_id': line.id, 'decision': 'approved'}],
        }, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_checker_sees_all_requests(self, checker_client, maker, product):
        other = _make_user('another_maker', 'maker')
        StockRequest.objects.create(created_by=maker, status='pending')
        StockRequest.objects.create(created_by=other, status='pending')
        response = checker_client.get('/api/requests/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
