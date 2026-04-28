"""
Tests for /api/auth endpoints.

Registration code behaviour:
  - REGISTRATION_CODE='' (set in conftest) → code not required
  - Tests that specifically cover code enforcement temporarily set the env var
"""


class TestRegistrationCode:
    """Verify the company invite-code gate on self-registration."""

    def test_register_rejected_with_wrong_code(self, client, app):
        # Enable code enforcement for this test only
        app.config['REGISTRATION_CODE'] = 'REALCODE'
        resp = client.post('/api/auth/register', json={
            'username': 'codetest1',
            'email': 'codetest1@test.com',
            'password': 'pass123',
            'first_name': 'Code',
            'last_name': 'Test',
            'registration_code': 'WRONGCODE',
        })
        assert resp.status_code == 403
        assert 'registration code' in resp.get_json()['error'].lower()
        app.config['REGISTRATION_CODE'] = ''

    def test_register_accepted_with_correct_code(self, client, app):
        app.config['REGISTRATION_CODE'] = 'REALCODE'
        resp = client.post('/api/auth/register', json={
            'username': 'codetest2',
            'email': 'codetest2@test.com',
            'password': 'pass123',
            'first_name': 'Code',
            'last_name': 'Test',
            'registration_code': 'REALCODE',
        })
        assert resp.status_code == 201
        app.config['REGISTRATION_CODE'] = ''


class TestRegister:
    def test_register_success(self, client):
        resp = client.post('/api/auth/register', json={
            'username': 'newuser1',
            'email': 'newuser1@test.com',
            'password': 'secure123',
            'first_name': 'New',
            'last_name': 'User',
        })
        assert resp.status_code == 201
        data = resp.get_json()
        assert data['user']['username'] == 'newuser1'
        assert data['user']['role'] == 'employee'

    def test_register_duplicate_username(self, client):
        payload = {
            'username': 'dupuser',
            'email': 'dup1@test.com',
            'password': 'pass123',
            'first_name': 'Dup',
            'last_name': 'User',
        }
        client.post('/api/auth/register', json=payload)
        payload['email'] = 'dup2@test.com'
        resp = client.post('/api/auth/register', json=payload)
        assert resp.status_code == 409
        assert 'Username' in resp.get_json()['error']

    def test_register_duplicate_email(self, client):
        client.post('/api/auth/register', json={
            'username': 'emaildup1',
            'email': 'shared@test.com',
            'password': 'pass123',
            'first_name': 'A',
            'last_name': 'B',
        })
        resp = client.post('/api/auth/register', json={
            'username': 'emaildup2',
            'email': 'shared@test.com',
            'password': 'pass123',
            'first_name': 'C',
            'last_name': 'D',
        })
        assert resp.status_code == 409
        assert 'Email' in resp.get_json()['error']

    def test_register_missing_field(self, client):
        resp = client.post('/api/auth/register', json={
            'username': 'incomplete',
            'email': 'incomplete@test.com',
            # missing password, first_name, last_name
        })
        assert resp.status_code == 400

    def test_register_role_is_always_employee(self, client):
        # Self-registration always creates an employee — the role field is ignored
        resp = client.post('/api/auth/register', json={
            'username': 'tryadmin',
            'email': 'tryadmin@test.com',
            'password': 'adminpass',
            'first_name': 'Try',
            'last_name': 'Admin',
            'role': 'admin',  # should be ignored
        })
        assert resp.status_code == 201
        assert resp.get_json()['user']['role'] == 'employee'

    def test_register_invalid_role_still_creates_employee(self, client):
        # Unknown role values are silently ignored — user is always created as employee
        resp = client.post('/api/auth/register', json={
            'username': 'badrole',
            'email': 'badrole@test.com',
            'password': 'pass123',
            'first_name': 'Bad',
            'last_name': 'Role',
            'role': 'superuser',
        })
        assert resp.status_code == 201
        assert resp.get_json()['user']['role'] == 'employee'


class TestLogin:
    def test_login_success(self, client):
        resp = client.post('/api/auth/login', json={
            'username': 'testemployee',
            'password': 'emppass123',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['username'] == 'testemployee'

    def test_login_wrong_password(self, client):
        resp = client.post('/api/auth/login', json={
            'username': 'testemployee',
            'password': 'wrongpassword',
        })
        assert resp.status_code == 401
        assert 'Invalid credentials' in resp.get_json()['error']

    def test_login_nonexistent_user(self, client):
        resp = client.post('/api/auth/login', json={
            'username': 'ghost',
            'password': 'anything',
        })
        assert resp.status_code == 401

    def test_login_missing_credentials(self, client):
        resp = client.post('/api/auth/login', json={})
        assert resp.status_code == 400

    def test_login_admin(self, client):
        resp = client.post('/api/auth/login', json={
            'username': 'testadmin',
            'password': 'adminpass123',
        })
        assert resp.status_code == 200
        assert resp.get_json()['user']['role'] == 'admin'


class TestMe:
    def test_me_returns_current_user(self, client, employee_token):
        resp = client.get(
            '/api/auth/me',
            headers={'Authorization': f'Bearer {employee_token}'},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['user']['username'] == 'testemployee'

    def test_me_requires_auth(self, client):
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401


class TestRefreshAndLogout:
    def test_refresh_token(self, client):
        login_resp = client.post('/api/auth/login', json={
            'username': 'testemployee',
            'password': 'emppass123',
        })
        refresh_token = login_resp.get_json()['refresh_token']
        resp = client.post(
            '/api/auth/refresh',
            headers={'Authorization': f'Bearer {refresh_token}'},
        )
        assert resp.status_code == 200
        assert 'access_token' in resp.get_json()

    def test_logout_blacklists_token(self, client):
        # Get a fresh token
        login_resp = client.post('/api/auth/login', json={
            'username': 'testemployee',
            'password': 'emppass123',
        })
        token = login_resp.get_json()['access_token']

        # Logout
        logout_resp = client.post(
            '/api/auth/logout',
            headers={'Authorization': f'Bearer {token}'},
        )
        assert logout_resp.status_code == 200

        # Token should now be revoked
        me_resp = client.get(
            '/api/auth/me',
            headers={'Authorization': f'Bearer {token}'},
        )
        assert me_resp.status_code == 401
