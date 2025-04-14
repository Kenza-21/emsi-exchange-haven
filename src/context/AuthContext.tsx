
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, studentId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      // Set up auth state listener first
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // Then check for existing session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      return () => subscription.unsubscribe();
    };

    initializeAuth();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, studentId: string) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Please connect to Supabase using the green button in the top right corner.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            student_id: studentId
          }
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Create a profile for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id,
            full_name: fullName,
            student_id: studentId
          }]);
          
        if (profileError) {
          console.error("Error creating profile:", profileError);
          toast({
            title: "Error creating profile",
            description: profileError.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Account created",
            description: "Your account has been created successfully."
          });
          
          if (data.session) {
            setSession(data.session);
            setUser(data.user);
            navigate('/');
          } else {
            toast({
              title: "Please check your email",
              description: "We've sent you an email with a confirmation link."
            });
          }
        }
      }
    } catch (error: any) {
      console.error("Error in signup:", error);
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Please connect to Supabase using the green button in the top right corner.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      setSession(data.session);
      setUser(data.user);
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in."
      });
      
      navigate('/');
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;

    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      navigate('/login');
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
