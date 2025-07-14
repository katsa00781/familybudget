import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-6xl font-bold text-gray-900 mb-4">404</h2>
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">
          Az oldal nem található
        </h1>
        <p className="text-gray-600 mb-8">
          Sajnáljuk, de a keresett oldal nem létezik vagy át lett helyezve.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Vissza a főoldalra
        </Link>
      </div>
    </div>
  )
}
