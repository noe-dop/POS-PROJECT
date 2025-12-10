import React from 'react';
import { User } from '@types';
import { Button } from '@components/ui/Button';

export const TestAliases: React.FC = () => {
  const user: User = {
    id: 1,
    username: 'test',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    user_type: 1,
    phone: '123456789',
    is_active: true,
    is_staff: false,
    is_superuser: false,
    date_joined: '2024-01-01',
    updated_at: '2024-01-01',
    permissions: undefined,
    role: ''
  };

  return (
    <div className="p-4">
      <Button>Test Button avec alias</Button>
      <p>User: {user.username}</p>
    </div>
  );
};