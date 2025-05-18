
import { RegisterForm } from '@/components/auth/RegisterForm';

const RegisterPage = () => {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
        <p className="text-gray-600">Join EMSI Exchange with your student account</p>
      </div>
      
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;
