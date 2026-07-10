/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Las imágenes van como data URL en JSON; necesitan más de 1 MB por defecto.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
