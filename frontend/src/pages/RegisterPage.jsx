import { UserPlus } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import { emailError, newPasswordError } from '../components/auth/validation';
import { useForm } from '../components/forms/useForm';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const validate = ({ name, email, password }) => ({
  name:
    name.trim().length < 2
      ? 'Enter at least 2 characters'
      : name.trim().length > 100
        ? 'Keep your name under 100 characters'
        : undefined,
  email: emailError(email),
  password: newPasswordError(password),
});

export default function RegisterPage() {
  useDocumentTitle('Create account');
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { field, handleSubmit, submitting, formError } = useForm(
    { name: '', email: '', password: '' },
    validate,
  );

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    await register({ name: name.trim(), email: email.trim(), password });
    navigate('/', { replace: true });
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Free forever for personal projects. No credit card."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-fg hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Banner data-testid="auth-error">{formError}</Banner>}
        <Input
          label="Full name"
          autoComplete="name"
          data-testid="register-name"
          data-autofocus
          {...field('name')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          data-testid="register-email"
          {...field('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          hint="8+ characters with at least one letter and one digit."
          data-testid="register-password"
          {...field('password')}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={UserPlus}
          loading={submitting}
          data-testid="register-submit"
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
