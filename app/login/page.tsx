import type { Metadata } from "next";
import Link from "next/link";
import AdminLoginForm from "../components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Admin Login | ABC Typing",
  description: "Secure administrator access for ABC Typing Services UAE.",
};

export default function LoginPage() {
  return (
    <main className="login-page-wrapper">
      <div className="login-box" data-aos="fade-up" data-aos-duration="800">
        {/* 60% Image Side */}
        <div className="login-image-side">
          <div className="login-image-top">
            <Link
              href="/"
              className="hero-logo-link"
              aria-label="ABC Typing Admin Homepage"
            >
              <span className="hero-logo-text">abc</span>
              <span className="hero-logo-dot" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* 40% Form Side */}
        <div className="login-form-side">
          <AdminLoginForm />

          {/* Centered Mobile Bottom Logo (Visible on mobile only) */}
          <div className="login-mobile-bottom-logo">
            <Link
              href="/"
              className="hero-logo-link hero-logo-link-mobile"
              aria-label="ABC Typing Admin Homepage"
            >
              <span className="hero-logo-text">abc</span>
              <span className="hero-logo-dot" aria-hidden="true" />
            </Link>
          </div>

          <div style={{ height: "10px" }} />
        </div>
      </div>
    </main>
  );
}
