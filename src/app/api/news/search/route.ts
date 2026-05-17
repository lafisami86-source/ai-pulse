import { isDatabaseAvailable, db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { mockArticles } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const lang = searchParams.get('lang') || 'ar'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = 12

    if (!q.trim()) {
      return NextResponse.json(
        { error: 'Search query parameter "q" is required' },
        { status: 400 }
      )
    }

    if (isDatabaseAvailable()) {
      const where = {
        OR: [
          { titleAr: { contains: q } },
          { titleEn: { contains: q } },
          { summaryAr: { contains: q } },
          { summaryEn: { contains: q } },
        ],
      }

      const [articles, total] = await Promise.all([
        db!.article.findMany({
          where,
          include: {
            source: true,
          },
          orderBy: {
            publishedAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db!.article.count({ where }),
      ])

      const isAr = lang === 'ar'
      const mappedArticles = articles.map((article) => ({
        ...article,
        title: isAr ? article.titleAr : article.titleEn,
        summary: isAr ? article.summaryAr : article.summaryEn,
        content: isAr ? article.contentAr : article.contentEn,
      }))

      return NextResponse.json({
        articles: mappedArticles,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        query: q,
      })
    }

    // Fallback to mock data - search across title and summary fields
    const isAr = lang === 'ar'
    const lowerQ = q.toLowerCase()
    const filtered = mockArticles.filter((a) => {
      return (
        a.titleAr.toLowerCase().includes(lowerQ) ||
        a.titleEn.toLowerCase().includes(lowerQ) ||
        a.summaryAr.toLowerCase().includes(lowerQ) ||
        a.summaryEn.toLowerCase().includes(lowerQ) ||
        a.tags.some((tag) => tag.toLowerCase().includes(lowerQ)) ||
        a.category.toLowerCase().includes(lowerQ)
      )
    })

    const total = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    const mappedArticles = paginated.map((article) => ({
      ...article,
      tags: JSON.stringify(article.tags),
      title: isAr ? article.titleAr : article.titleEn,
      summary: isAr ? article.summaryAr : article.summaryEn,
      content: isAr ? article.contentAr : article.contentEn,
    }))

    return NextResponse.json({
      articles: mappedArticles,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      query: q,
    })
  } catch (error) {
    console.error('Error searching articles:', error)
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    )
  }
}
