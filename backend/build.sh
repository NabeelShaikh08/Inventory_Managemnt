#!/usr/bin/env bash
set -e

pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata inventory/fixtures/initial_data.json || true
python manage.py seed_users
python manage.py collectstatic --no-input
