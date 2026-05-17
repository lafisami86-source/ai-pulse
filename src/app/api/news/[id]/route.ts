import { isDatabaseAvailable, db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getArticleById, mockArticles } from '@/lib/mock-data'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDatabaseAvailable()) {
      const article = await db!.article.findUnique({
        where: { id },
        include: {
          source: true,
        },
      })

      if (!article) {
        return NextResponse.json(
          { error: 'Article not found' },
          { status: 404 }
        )
      }

      // Increment views
      await db!.article.update({
        where: { id },
        data: { views: { increment: 1 } },
      })

      // Determine language preference from query params
      const { searchParams } = new URL(request.url)
      const lang = searchParams.get('lang') || 'ar'
      const isAr = lang === 'ar'

      const mappedArticle = {
        ...article,
        views: article.views + 1,
        title: isAr ? article.titleAr : article.titleEn,
        summary: isAr ? article.summaryAr : article.summaryEn,
        content: isAr ? article.contentAr : article.contentEn,
      }

      return NextResponse.json({ article: mappedArticle })
    }

    // Fallback to mock data
    const mockArticle = getArticleById(id)

    if (!mockArticle) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'ar'
    const isAr = lang === 'ar'

    const mappedArticle = {
      ...mockArticle,
      tags: JSON.stringify(mockArticle.tags),
      views: mockArticle.views + 1,
      title: isAr ? mockArticle.titleAr : mockArticle.titleEn,
      summary: isAr ? mockArticle.summaryAr : mockArticle.summaryEn,
      content: isAr ? mockArticle.contentAr : mockArticle.contentEn,
    }

    return NextResponse.json({ article: mappedArticle })
  } catch (error) {
    console.error('Error fetching article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}
