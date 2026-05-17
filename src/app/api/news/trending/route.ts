import { isDatabaseAvailable, db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { mockArticles } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get('lang') || 'ar'
    const isAr = lang === 'ar'

    if (isDatabaseAvailable()) {
      const articles = await db!.article.findMany({
        where: {
          isTrending: true,
        },
        include: {
          source: true,
        },
        orderBy: {
          views: 'desc',
        },
        take: 10,
      })

      const mappedArticles = articles.map((article) => ({
        ...article,
        title: isAr ? article.titleAr : article.titleEn,
        summary: isAr ? article.summaryAr : article.summaryEn,
        content: isAr ? article.contentAr : article.contentEn,
      }))

      return NextResponse.json({ articles: mappedArticles })
    }

    // Fallback to mock data
    const trending = mockArticles
      .filter((a) => a.isTrending)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    const mappedArticles = trending.map((article) => ({
      ...article,
      tags: JSON.stringify(article.tags),
      title: isAr ? article.titleAr : article.titleEn,
      summary: isAr ? article.summaryAr : article.summaryEn,
      content: isAr ? article.contentAr : article.contentEn,
    }))

    return NextResponse.json({ articles: mappedArticles })
  } catch (error) {
    console.error('Error fetching trending articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending articles' },
      { status: 500 }
    )
  }
}
