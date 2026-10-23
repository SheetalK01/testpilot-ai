import { LogIn } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordInput from '../components/auth/PasswordInput';
import { emailError } from '../components/auth/validation';
import { useForm } from '../components/forms/useForm';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const validate = ({ email, password }) => ({
  email: emailError(email),
  password: password ? undefined : 'Password is required',
});

export default function LoginPage() {
  useDocumentTitle('Log in');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { field, handleSubmit, submitting, formError } = useForm(
    { email: '', password: '' },
    validate,
  );

  if (user) return <Navigate to="/" replace />;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    await login({ email: email.trim(), password });
    navigate(location.state?.from ?? '/', { replace: true });
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue turning stories into test cases."
      footer={
        <>
          New to TestPilot AI?{' '}
          <Link to="/register" className="font-medium text-accent-fg hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Banner data-testid="auth-error">{formError}</Banner>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          data-testid="login-email"
          data-autofocus
          {...field('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          data-testid="login-password"
          {...field('password')}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={LogIn}
          loading={submitting}
          data-testid="login-submit"
        >
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
