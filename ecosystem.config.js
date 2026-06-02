module.exports = {
  apps: [
    {
      name: "sonoray-backend",
      script: "npm",
      args: "run start",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        DATABASE_URL: "mysql://sonoray_user:Sonoray2026@localhost:3306/sonoray",
        JWT_SECRET: "sonoray_production_secret_key_2026"
      }
    },
    {
      name: "sonoray-frontend",
      script: "npm",
      args: "run start",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_URL: "" // Next.js handles API routing via rewrites to backend Port 5000
      }
    }
  ]
};
