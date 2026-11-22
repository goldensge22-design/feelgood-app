import { Card, CardContent } from '@/vendor/career-lab/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              페이지를 찾을 수 없어요
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            주소를 확인하거나 메뉴에서 탐색을 계속해 주세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
