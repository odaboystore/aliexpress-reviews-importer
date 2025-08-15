import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import * as cheerio from "cheerio";

dotenv.config();
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Servidor de AliExpress HTML Scraper funcionando");
});

// Función para extraer datos del HTML
function extractProductData(html) {
  const $ = cheerio.load(html);
  let data = {
    rating: 0,
    reviews: 0,
    sold: 0,
    raw_data: {}
  };

  try {
    // Buscar el contenedor principal de reviewer
    const reviewerWrap = $('.reviewer--wrap--vGS7G6P');
    
    if (reviewerWrap.length > 0) {
      // Extraer rating - buscar el texto del strong
      const ratingElement = reviewerWrap.find('strong');
      if (ratingElement.length > 0) {
        const ratingText = ratingElement.text().trim().replace(/\s+/g, '');
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
          data.rating = parseFloat(ratingMatch[1]);
          data.raw_data.rating_text = ratingText;
        }
      }

      // Extraer reviews - buscar el texto que contenga "Reviews"
      const reviewsElement = reviewerWrap.find('a.reviewer--reviews--cx7Zs_V');
      if (reviewsElement.length > 0) {
        const reviewsText = reviewsElement.text().trim();
        const reviewsMatch = reviewsText.match(/(\d+)\s*Reviews?/i);
        if (reviewsMatch) {
          data.reviews = parseInt(reviewsMatch[1]);
          data.raw_data.reviews_text = reviewsText;
        }
      }

      // Extraer sold - buscar el texto que contenga "sold"
      const soldElement = reviewerWrap.find('.reviewer--sold--ytPeoEy');
      if (soldElement.length > 0) {
        const soldText = soldElement.text().trim();
        const soldMatch = soldText.match(/(\d+[\d,]*)\+?\s*sold/i);
        if (soldMatch) {
          // Remover comas y convertir a número
          const soldNumber = soldMatch[1].replace(/,/g, '');
          data.sold = parseInt(soldNumber);
          data.raw_data.sold_text = soldText;
        }
      }

      // Información adicional para debugging
      data.raw_data.found_reviewer_wrap = true;
      data.raw_data.rating_elements_found = reviewerWrap.find('strong').length;
      data.raw_data.reviews_elements_found = reviewerWrap.find('a.reviewer--reviews--cx7Zs_V').length;
      data.raw_data.sold_elements_found = reviewerWrap.find('.reviewer--sold--ytPeoEy').length;

    } else {
      // Métodos alternativos si no encuentra el contenedor principal
      data.raw_data.found_reviewer_wrap = false;
      
      // Buscar rating por patrones alternativos
      const ratingAlternatives = [
        $('strong:contains(".")', '.rating').first(),
        $('[class*="rating"] strong').first(),
        $('strong').filter((i, el) => {
          const text = $(el).text().trim();
          return /^\d+\.\d+$/.test(text);
        }).first()
      ];

      for (let alt of ratingAlternatives) {
        if (alt.length > 0) {
          const ratingText = alt.text().trim();
          const ratingMatch = ratingText.match(/(\d+\.\d+)/);
          if (ratingMatch) {
            data.rating = parseFloat(ratingMatch[1]);
            data.raw_data.rating_method = 'alternative';
            break;
          }
        }
      }

      // Buscar reviews por patrones alternativos
      const reviewsAlternatives = [
        $('a:contains("Reviews")').first(),
        $('[class*="review"]:contains("Reviews")').first(),
        $('*').filter((i, el) => {
          const text = $(el).text();
          return /\d+\s*Reviews?/i.test(text);
        }).first()
      ];

      for (let alt of reviewsAlternatives) {
        if (alt.length > 0) {
          const reviewsText = alt.text().trim();
          const reviewsMatch = reviewsText.match(/(\d+)\s*Reviews?/i);
          if (reviewsMatch) {
            data.reviews = parseInt(reviewsMatch[1]);
            data.raw_data.reviews_method = 'alternative';
            break;
          }
        }
      }

      // Buscar sold por patrones alternativos
      const soldAlternatives = [
        $('*:contains("sold")').first(),
        $('[class*="sold"]').first()
      ];

      for (let alt of soldAlternatives) {
        if (alt.length > 0) {
          const soldText = alt.text().trim();
          const soldMatch = soldText.match(/(\d+[\d,]*)\+?\s*sold/i);
          if (soldMatch) {
            const soldNumber = soldMatch[1].replace(/,/g, '');
            data.sold = parseInt(soldNumber);
            data.raw_data.sold_method = 'alternative';
            break;
          }
        }
      }
    }

  } catch (error) {
    data.error = error.message;
    data.raw_data.extraction_error = error.message;
  }

  return data;
}

// Función para hacer scraping de una URL de AliExpress
async function scrapeAliExpressProduct(url) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const response = await axios.get(url, {
      headers,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return extractProductData(response.data);

  } catch (error) {
    console.error('Error en scraping:', error.message);
    throw error;
  }
}

// Endpoint para scraping por URL
app.get("/scrape/url", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "Falta parámetro 'url'" });
  }

  // Validar que sea una URL de AliExpress
  if (!url.includes('aliexpress.com')) {
    return res.status(400).json({ error: "La URL debe ser de AliExpress" });
  }

  try {
    const data = await scrapeAliExpressProduct(url);
    
    res.json({
      url,
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      url,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para scraping por product ID (construye la URL automáticamente)
app.get("/scrape/product", async (req, res) => {
  const { productId } = req.query;
  
  if (!productId) {
    return res.status(400).json({ error: "Falta parámetro 'productId'" });
  }

  // Construir URL de AliExpress
  const url = `https://www.aliexpress.com/item/${productId}.html`;

  try {
    const data = await scrapeAliExpressProduct(url);
    
    res.json({
      product_id: productId,
      url,
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      product_id: productId,
      url,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para procesar HTML directamente (para testing)
app.get("/scrape/url", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Falta el parámetro 'url'" });
  }
  
  try {
    const data = extractProductData(html);
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de monitoreo para múltiples productos
app.post("/scrape/batch", async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "Se requiere un array de 'urls'" });
  }

  if (urls.length > 10) {
    return res.status(400).json({ error: "Máximo 10 URLs por batch" });
  }

  const results = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    try {
      console.log(`Procesando URL ${i + 1}/${urls.length}: ${url}`);
      
      const data = await scrapeAliExpressProduct(url);
      
      results.push({
        index: i,
        url,
        success: true,
        data,
        timestamp: new Date().toISOString()
      });

      // Delay entre requests para evitar rate limiting
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`Error en URL ${i + 1}: ${error.message}`);
      
      results.push({
        index: i,
        url,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  res.json({
    batch_summary: {
      total_urls: urls.length,
      successful,
      failed,
      success_rate: `${Math.round((successful / urls.length) * 100)}%`
    },
    results,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server corriendo en puerto ${PORT}`);
  console.log("\n=== ENDPOINTS DISPONIBLES ===");
  console.log("GET  /                     - Status del servidor");
  console.log("GET  /scrape/url?url=...   - Scraping por URL completa");
  console.log("GET  /scrape/product?productId=... - Scraping por Product ID");
  console.log("POST /scrape/html          - Procesar HTML directamente");
  console.log("POST /scrape/batch         - Scraping en lote");
  console.log("==============================\n");
});
