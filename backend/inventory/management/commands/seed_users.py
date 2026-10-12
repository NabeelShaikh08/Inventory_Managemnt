from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inventory.models import UserProfile


class Command(BaseCommand):
    help = 'Create default test users with roles for the application'

    def handle(self, *args, **options):
        users = [
            {
                'username': 'admin',
                'password': 'Admin@123',
                'is_staff': True,
                'is_superuser': True,
                'role': 'superadmin',
            },
            {
                'username': 'checker',
                'password': 'Checker@123',
                'is_staff': False,
                'is_superuser': False,
                'role': 'checker',
            },
            {
                'username': 'storekeeper',
                'password': 'Store@123',
                'is_staff': False,
                'is_superuser': False,
                'role': 'maker',
            },
        ]

        for u in users:
            role = u.pop('role')
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'is_staff': u['is_staff'],
                    'is_superuser': u['is_superuser'],
                },
            )
            if created:
                user.set_password(u['password'])
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user: {user.username}"))
            else:
                self.stdout.write(f"User already exists: {user.username}")

            profile, profile_created = UserProfile.objects.get_or_create(
                user=user,
                defaults={'role': role},
            )
            if not profile_created and profile.role != role:
                profile.role = role
                profile.save()
            self.stdout.write(
                self.style.SUCCESS(f"  role: {profile.role}")
            )
