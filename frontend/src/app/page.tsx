'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import styled from 'styled-components';
import PulseBurstLoader from '@/components/ui/PulseBurstLoader';
import { loginUser, getMe } from '@/lib/api/auth';

export default function LoginSample() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('secret');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const data = await loginUser(email, password);
      sessionStorage.setItem('access_token', data.access_token);
      
      try {
        const meData = await getMe(data.access_token);
        console.log("Logged in user role:", meData.role);
        
        if (meData.preferences && meData.preferences.theme) {
          setTheme(meData.preferences.theme);
        }
        
        setMessage(`✓ Login Successful! Redirecting...`);
        setTimeout(() => {
          router.push(`/portal/${meData.id}`);
        }, 700);
        return;
      } catch (err: any) {
        console.error("getMe failed:", err);
        setMessage(`✗ Failed to get user profile: ${err.message}`);
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      if (error.message.includes('Invalid credentials')) {
        setMessage('✗ Login failed. Invalid credentials.');
      } else {
        setMessage('✗ Error connecting to the server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center items-center px-4 font-sans antialiased text-slate-900" 
      style={{ backgroundImage: "url('/login-bg-new.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <PulseBurstLoader size={220} isLoading={isLoading}>
        <div style={{ display: message.includes('✓') ? 'none' : 'block' }}>
          <StyledWrapper>
            <div className="container">
              <div className="heading">Sign In</div>
              <form onSubmit={handleLogin} className="form">
                <input 
                  required 
                  className="input" 
                  type="email" 
                  name="email" 
                  id="email" 
                  placeholder="E-mail" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input 
                  required 
                  className="input" 
                  type="password" 
                  name="password" 
                  id="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="forgot-password"><a href="#">Forgot Password ?</a></span>
                <input 
                  className="login-button" 
                  type="submit" 
                  value={isLoading ? "Authenticating..." : "Sign In"} 
                  disabled={isLoading} 
                />
              </form>
              
              {message && (
                <div style={{
                  marginTop: '20px',
                  padding: '10px 15px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: message.includes('✓') ? '#e6f4ea' : '#fce8e6',
                  color: message.includes('✓') ? '#137333' : '#c5221f',
                  border: `1px solid ${message.includes('✓') ? '#ceead6' : '#fad2cf'}`
                }}>
                  {message}
                </div>
              )}
            </div>
          </StyledWrapper>
        </div>
      </PulseBurstLoader>
    </div>
  );
}

const StyledWrapper = styled.div`
  .container {
    max-width: 350px;
    background: #F8F9FD;
    background: linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(244, 247, 251) 100%);
    border-radius: 40px;
    padding: 25px 35px;
    border: 5px solid rgb(255, 255, 255);
    box-shadow: rgba(133, 189, 215, 0.8784313725) 0px 30px 30px -20px;
    margin: 20px;
  }

  .heading {
    text-align: center;
    font-weight: 900;
    font-size: 30px;
    color: rgb(16, 137, 211);
  }

  .form {
    margin-top: 20px;
  }

  .form .input {
    width: 100%;
    background: white;
    border: none;
    padding: 15px 20px;
    border-radius: 20px;
    margin-top: 15px;
    box-shadow: #cff0ff 0px 10px 10px -5px;
    border-inline: 2px solid transparent;
  }

  .form .input::-moz-placeholder {
    color: rgb(170, 170, 170);
  }

  .form .input::placeholder {
    color: rgb(170, 170, 170);
  }

  .form .input:focus {
    outline: none;
    border-inline: 2px solid #12B1D1;
  }

  .form .forgot-password {
    display: block;
    margin-top: 10px;
    margin-left: 10px;
  }

  .form .forgot-password a {
    font-size: 11px;
    color: #0099ff;
    text-decoration: none;
  }

  .form .login-button {
    display: block;
    width: 100%;
    font-weight: bold;
    background: linear-gradient(45deg, rgb(16, 137, 211) 0%, rgb(18, 177, 209) 100%);
    color: white;
    padding-block: 15px;
    margin: 20px auto 0 auto;
    border-radius: 20px;
    box-shadow: rgba(133, 189, 215, 0.8784313725) 0px 20px 10px -15px;
    border: none;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
  }

  .form .login-button:hover {
    transform: scale(1.03);
    box-shadow: rgba(133, 189, 215, 0.8784313725) 0px 23px 10px -20px;
  }

  .form .login-button:active {
    transform: scale(0.95);
    box-shadow: rgba(133, 189, 215, 0.8784313725) 0px 15px 10px -10px;
  }
`;