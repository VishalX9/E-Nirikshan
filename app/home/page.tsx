'use client';
import { useState, useEffect } from 'react';
import styles from '../../styles/home.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "employee",
  employerType: "field",
};

export default function Home() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const payload = isLogin
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // CRITICAL: Set auth state first, then navigate
      signIn({ token: data.token, user: data.user });
      router.replace('/dashboard');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const scrollToLogin = () => {
    document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleMode = () => {
    setIsLogin(prev => !prev);
    setError('');
    setFormData(initialForm);
  };

  return (
    <div className={styles.pageContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroBackground}></div>
        <div className={`${styles.heroContent} ${isVisible ? styles.fadeIn : ''}`}>
          <header className={styles.logoHeader}>
            <div className={styles.mainLogo}>
              <span className={styles.logoIcon}>
                <img src="/logo.png" alt="E-Nirikshan Logo" className={styles.logoImg} />
              </span>
              <span className={styles.logoTextHero}>e-निरीक्षण</span>
            </div>
            <div className={styles.authButtons}>
              <button className={styles.loginNavButton} onClick={scrollToLogin}>Login</button>
              <button 
                className={styles.signupNavButton} 
                onClick={() => {
                  setIsLogin(false);
                  scrollToLogin();
                }}
              >
                Sign Up
              </button>
            </div>
          </header>

          <main>
            <h1 className={styles.heroTitle}>
              Transforming Government{' '}
              <span className={styles.heroTitleGradient}>Productivity</span> with Data
            </h1>
            <p className={styles.heroSubtitle}>
              The next-generation Performance Management System that brings transparency, accountability, and excellence to public service.
            </p>

            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>100+</div>
                <div className={styles.statLabel}>Departments</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>10K+</div>
                <div className={styles.statLabel}>Officials</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNumber}>98%</div>
                <div className={styles.statLabel}>Accuracy</div>
              </div>
            </div>

            <button className={styles.ctaButton} onClick={scrollToLogin}>
              Access Portal <span className={styles.arrow}>→</span>
            </button>
          </main>
        </div>
      </section>

      {/* Problem Section */}
      <section className={styles.problemSection}>
        <div className={styles.sectionContainer}>
          <span className={styles.sectionBadge}>The Challenge</span>
          <h2 className={styles.sectionTitle}>The Old Way Doesn't Work</h2>

          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>❌</div>
              <h3>Subjective Appraisals</h3>
              <p>Performance reviews based on personal opinions rather than objective metrics.</p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>📉</div>
              <h3>No Real-Time Tracking</h3>
              <p>Waiting until year-end to discover performance gaps and missed opportunities.</p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>🎯</div>
              <h3>Unclear Goals</h3>
              <p>Employees unsure about expectations and how their work contributes to organizational goals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className={styles.solutionSection}>
        <div className={styles.sectionContainer}>
          <span className={styles.sectionBadge}>Our Solution</span>
          <h2 className={styles.sectionTitle}>A Data-Driven Revolution</h2>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>✓</div>
              <h3>Objective KPIs</h3>
              <p>Role-specific, measurable key performance indicators that eliminate bias.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📈</div>
              <h3>Real-Time Dashboards</h3>
              <p>Monitor progress continuously with live data and instant feedback mechanisms.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💯</div>
              <h3>Fair Scoring System</h3>
              <p>A transparent, standardized scoring system for consistent performance evaluation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login / Signup Section */}
      <section id="login-section" className={styles.loginSection}>
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <span className={styles.loginLogoText}>e-निरीक्षण Portal</span>
              <p className={styles.loginTagline}>Performance Management System</p>
            </div>

            {error && (
              <div style={{
                marginBottom: '1.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem'
              }}>
                <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.loginForm}>
              {!isLogin && (
                <div className={styles.inputGroup}>
                  <label htmlFor="name" className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  {isLogin ? 'Email' : 'Email'}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="••••••••"
                  required
                />
              </div>

              {!isLogin && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="role" className={styles.label}>Role</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className={styles.input}
                    >
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {formData.role === 'employee' && (
                    <div className={styles.inputGroup}>
                      <label htmlFor="employerType" className={styles.label}>Employer Type</label>
                      <select
                        id="employerType"
                        name="employerType"
                        value={formData.employerType}
                        onChange={handleChange}
                        className={styles.input}
                        required
                      >
                        <option value="field">Field Employee</option>
                        <option value="hq">Headquarter Employee</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <button type="submit" disabled={loading} className={styles.loginButton}>
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>

              <p className="text-center text-gray-600 mt-4">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="text-black font-medium hover:underline"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 e-निरीक्षण. A Digital India Initiative.</p>
      </footer>
    </div>
  );
}