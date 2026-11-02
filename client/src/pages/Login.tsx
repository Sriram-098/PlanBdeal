import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { loginFormSchema, LoginFormInput } from '../utils/authSchema';

export function Login() {
  const { login } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput>({ resolver: zodResolver(loginFormSchema) });

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const onSubmit = async (data: LoginFormInput) => {
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('root', { message: (err as Error).message });
      show((err as Error).message, 'error');
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-8">
      <Card className="w-full p-6">
        <h1 className="mb-6 text-2xl font-bold text-white">Log in to PlanBDeal</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" {...register('password')} error={errors.password?.message} />
          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Log in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-cine-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-cine-accent hover:underline">
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
