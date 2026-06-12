import NavBar from '@/components/public/NavBar'

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  )
}
