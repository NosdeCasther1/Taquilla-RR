import { AppBrand } from "@/components/app-brand";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-md items-center justify-center px-3">
        <AppBrand size="sm" />
      </div>
    </header>
  );
}
