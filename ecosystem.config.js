module.exports = {
  apps: [
    {
      name: "sonoray-backend",
      script: "dist/index.js",
      cwd: "./backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    },
    {
      name: "sonoray-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
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
