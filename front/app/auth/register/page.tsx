"use client";

import { useState, FormEvent } from "react";
import { Button, Input, Link, Form, Divider, addToast } from "@heroui/react";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/providers/AuthProvider";

export default function Page() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { register, isLoading: authLoading } = useAuth();
  
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  
  const errorPassword: string[] = [];
  let errorConfirmPassword: string | null = null;
  
  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
  
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    
    if (password !== confirmPassword) {
      setLoading(false);
      return;
    }
    
    // Vérifiez que le mot de passe est suffisamment fort
    if (errorPassword.length > 0) {
      setLoading(false);
      return;
    }
    
    try {
      await register({
        email,
        password
      });
      
      // Redirection après l'inscription réussie
      router.push("/auth/signin");
    } catch (error) {
      console.error("Error during registration:", error);
      // Les toasts d'erreur sont déjà gérés dans le provider
    } finally {
      setLoading(false);
    }
  };
  
  const errorMessages = () => {
    return (
      <ul>
        {errorPassword.map((error, i) => (
          <li key={i+"dd"}>{error}</li>
        ))}
      </ul>
    )
  }
  
  if (password.length > 0) {
    if (password.length < 4) {
      errorPassword.push("Password must be 4 characters or more.");
    }
    // if ((password.match(/[A-Z]/g) || []).length < 1) {
    //   errorPassword.push("Password must include at least 1 upper case letter");
    // }
    // if ((password.match(/[^a-z0-9]/gi) || []).length < 1) {
    //   errorPassword.push("Password must include at least 1 symbol.");
    // }
    if (password !== confirmPassword) {
      errorConfirmPassword = "Passwords do not match.";
    }
  }
  
  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 py-6 shadow-small">
        <div className="flex flex-col gap-1">
          <h1 className="text-large font-medium">Create an account</h1>
          <p className="text-small text-default-500">to continue to BypolarMedia</p>
        </div>
        
        <Form className="flex flex-col gap-3" validationBehavior="native" onSubmit={handleSubmit}>
          
          <Input
            isRequired
            label="Email Address"
            name="email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
            value={email}
            onValueChange={setEmail}
          />
          <Input
            value={password}
            onValueChange={setPassword}
            isRequired
            endContent={
              <button type="button" onClick={togglePasswordVisibility}>
                {isPasswordVisible ? (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
            label="Password"
            name="password"
            placeholder="Enter your password"
            type={isPasswordVisible ? "text" : "password"}
            variant="bordered"
            isInvalid={errorPassword.length > 0}
            errorMessage={() => errorMessages()}
          />
          <Input
            value={confirmPassword}
            onValueChange={setConfirmPassword}
            isRequired
            endContent={
              <button type="button" onClick={toggleConfirmPasswordVisibility}>
                {isConfirmPasswordVisible ? (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-closed-linear"
                  />
                ) : (
                  <Icon
                    className="pointer-events-none text-xl text-default-400"
                    icon="solar:eye-bold"
                  />
                )}
              </button>
            }
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Enter your password"
            type={isConfirmPasswordVisible ? "text" : "password"}
            variant="bordered"
            isInvalid={!!errorConfirmPassword}
            errorMessage={errorConfirmPassword}
          />
          
          <Button 
            isLoading={loading || authLoading} 
            className="w-full" 
            color="primary" 
            type="submit"
            disabled={errorPassword.length > 0 || !!errorConfirmPassword}
          >
            Register
          </Button>
        </Form>
        {/* <div className="flex items-center gap-4 py-2">
          <Divider className="flex-1"/>
          <p className="shrink-0 text-tiny text-default-500">OR</p>
          <Divider className="flex-1"/>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            startContent={<Icon icon="flat-color-icons:google" width={24}/>}
            variant="bordered"
            onPress={() => console.log("Google todo")}
          >
            Continue with Google
          </Button>
          <Button
            startContent={<Icon className="text-default-500" icon="fe:github" width={24}/>}
            variant="bordered"
            onPress={() => console.log("Github todo")}
          >
            Continue with Github
          </Button>
        </div> */}
        <p className="text-center text-small">
          Already an account ?&nbsp;
          <Link href="/auth/signin" size="sm">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
