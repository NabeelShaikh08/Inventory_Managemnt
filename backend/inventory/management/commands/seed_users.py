from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create default test users for the application'

    def handle(self, *args, **options):
        users = [
            {'username': 'admin', 'password': 'Admin@123', 'is_staff': True, 'is_superuser': True},
            {'username': 'storekeeper', 'password': 'Store@123', 'is_staff': False, 'is_superuser': False},
        ]

        for u in users:
            if not User.objects.filter(username=u['username']).exists():
                User.objects.create_user(
                    username=u['username'],
                    password=u['password'],
                    is_staff=u['is_staff'],
                    is_superuser=u['is_superuser'],
                )
                self.stdout.write(self.style.SUCCESS(f"Created user: {u['username']}"))
            else:
                self.stdout.write(f"User already exists: {u['username']}")
