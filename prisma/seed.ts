import { PrismaClient } from '.prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('开始导入种子数据...')

  // 1. 创建管理员
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@ethan-security.com',
      displayName: '超级管理员',
      role: 'ADMIN'
    }
  })
  console.log('✓ 管理员账号创建成功: admin / admin123')

  // 2. 创建分类
  const categories = [
    { slug: 'ptz', name: { zh: '枪球联动', en: 'PTZ Linkage', es: 'Seguimiento PTZ' }, icon: 'PTZ', sortOrder: 1 },
    { slug: 'outdoor', name: { zh: '太阳能/4G摄像头', en: 'Solar/4G Camera', es: 'Cámara Solar/4G' }, icon: 'SOL', sortOrder: 2 },
    { slug: 'indoor', name: { zh: '室内云台', en: 'Indoor PTZ', es: 'PTZ interior' }, icon: 'IND', sortOrder: 3 },
    { slug: 'ai', name: { zh: '云台摄像头', en: 'PTZ Camera', es: 'Cámara PTZ' }, icon: 'PTZ', sortOrder: 4 },
    { slug: 'ip', name: { zh: '变焦摄像头', en: 'Zoom Camera', es: 'Cámara con Zoom' }, icon: 'ZM', sortOrder: 5 },
    { slug: 'wired', name: { zh: '有线摄像头', en: 'Wired Camera', es: 'Cámara cableada' }, icon: 'WRD', sortOrder: 6 }
  ]
  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat })
  }
  console.log(`✓ ${categories.length} 个分类创建成功`)

  const catPtz = await prisma.category.findUnique({ where: { slug: 'ptz' } })
  const catOutdoor = await prisma.category.findUnique({ where: { slug: 'outdoor' } })
  const catIndoor = await prisma.category.findUnique({ where: { slug: 'indoor' } })
  const catAi = await prisma.category.findUnique({ where: { slug: 'ai' } })
  const catIp = await prisma.category.findUnique({ where: { slug: 'ip' } })

  // 3. 创建产品
  const products = [
    {
      slug: 'ethan-4k-dome-pro',
      name: { zh: '乔安枪球联动摄像头', en: 'Qiaoan PTZ Linkage Camera', es: 'Cámara PTZ con seguimiento Qiaoan' },
      sku: 'JA-PTZ-LINK', categoryId: catPtz!.id, price: 70.86, moq: 10, brand: '乔安',
      badge: 'bestseller',
      summary: { zh: '乔安枪球联动摄像头，360° 全景云台视角，支持红外/智能/全彩夜视、人形追踪与声光警戒，SD 卡及云端双存储。', en: 'Qiaoan PTZ linkage camera with 360° panoramic view, infrared/smart/full-color night vision, human tracking, sound & light alarm, SD and cloud storage.', es: 'Cámara PTZ Qiaoan con vista panorámica 360°, visión nocturna IR/inteligente/a color, seguimiento humano, alarma sonora y luminosa.' },
      highlights: [{ zh: '360° 全景', en: '360° Panoramic', es: '360° Panorámica' }, { zh: '夜视 30m', en: '30m Night Vision', es: '30 m nocturna' }, { zh: '双向对讲', en: 'Two-way Audio', es: 'Audio bidireccional' }, { zh: '全彩夜视', en: 'Full-Color NV', es: 'Nocturna a color' }],
      details: [[{ zh: '产品型号', en: 'Model', es: 'Modelo' }, { zh: '乔安枪球联动', en: 'Qiaoan PTZ Linkage', es: 'PTZ Qiaoan' }], [{ zh: '云台视角', en: 'PTZ Angle', es: 'Ángulo PTZ' }, { zh: '360°全景', en: '360° Panoramic', es: '360° Panorámica' }], [{ zh: '夜视距离', en: 'Night Vision', es: 'Visión nocturna' }, { zh: '30米以内', en: 'Within 30m', es: 'Hasta 30m' }], [{ zh: '存储方式', en: 'Storage', es: 'Almacenamiento' }, { zh: 'SD卡/云端', en: 'SD/Cloud', es: 'SD/Nube' }]],
      logistics: { moq: { zh: '10 台', en: '10 pcs', es: '10 uds' }, leadTime: { zh: '7-15 天', en: '7-15 days', es: '7-15 días' }, warranty: { zh: '2 年', en: '2 years', es: '2 años' } },
      images: { main: '/images/products/sv-4k-dome-pro.jpg', gallery: [] },
      seoTitle: 'Qiaoan PTZ Linkage Camera OEM Manufacturer', seoDesc: 'Professional PTZ linkage camera with 360° view',
      sortOrder: 1
    },
    {
      slug: 'ethan-ptz-360-ultra',
      name: { zh: '乔安 G4S4 变焦三镜头太阳能摄像头', en: 'Joaan G4S4 Zoom Triple Lens Solar Camera', es: 'Cámara Solar Joaan G4S4 con Zoom y Triple Lente' },
      sku: 'JA-G4S4', categoryId: catOutdoor!.id, price: 97.61, moq: 5, brand: '乔安',
      badge: 'new',
      summary: { zh: '乔安 G4S4 太阳能摄像头，适配器与太阳能双供电，4G/5G 流量卡联网，变焦三镜头，IP66 防护。', en: 'Joaan G4S4 solar camera with adapter and solar power, 4G/5G SIM connectivity, zoom triple lens, IP66 rated.', es: 'Cámara solar Joaan G4S4 con adaptador y energía solar, SIM 4G/5G, zoom triple lente, IP66.' },
      highlights: [{ zh: '太阳能', en: 'Solar Power', es: 'Energía solar' }, { zh: '4G/5G', en: '4G/5G', es: '4G/5G' }, { zh: 'IP66', en: 'IP66', es: 'IP66' }, { zh: '三镜头变焦', en: 'Triple Lens Zoom', es: 'Zoom triple lente' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '防护等级', en: 'Protection', es: 'Protección' }, 'IP66'], [{ zh: '供电方式', en: 'Power', es: 'Alimentación' }, { zh: '太阳能+适配器', en: 'Solar+Adapter', es: 'Solar+Adaptador' }]],
      logistics: { moq: { zh: '5 台', en: '5 pcs', es: '5 uds' }, leadTime: { zh: '10-18 天', en: '10-18 days', es: '10-18 días' }, warranty: { zh: '3 年', en: '3 years', es: '3 años' } },
      images: { main: '/images/products/sv-ptz-360-ultra.jpg', gallery: [] },
      seoTitle: 'Solar 4G Security Camera OEM', seoDesc: 'Triple lens solar camera with 4G/5G',
      sortOrder: 2
    },
    {
      slug: 'ethan-ai-face-pro',
      name: { zh: '乔安 4G/5G 智能摄像头', en: 'Qiaoan 4G/5G Smart Camera', es: 'Cámara inteligente Qiaoan 4G/5G' },
      sku: 'JA-G4W16', categoryId: catOutdoor!.id, price: 71.08, moq: 10, brand: '乔安',
      badge: 'hot',
      summary: { zh: '乔安 4G/5G 摄像头，流量卡供网，双光夜视，支持人脸识别、周界报警与 PIR 人体感应，IP66 防护。', en: 'Qiaoan 4G/5G camera with SIM connectivity, dual-light night vision, face recognition, perimeter alarm and PIR detection, IP66.', es: 'Cámara Qiaoan 4G/5G con SIM, visión nocturna de doble luz, reconocimiento facial, alarma perimetral y PIR, IP66.' },
      highlights: [{ zh: '4G/5G', en: '4G/5G', es: '4G/5G' }, { zh: 'IP66', en: 'IP66', es: 'IP66' }, { zh: '人脸识别', en: 'Face Recognition', es: 'Reconocimiento facial' }, { zh: '双光夜视', en: 'Dual-Light NV', es: 'Doble luz' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Qiaoan', es: 'Qiaoan' }], [{ zh: '防护等级', en: 'Protection', es: 'Protección' }, 'IP66']],
      logistics: { moq: { zh: '10 台', en: '10 pcs', es: '10 uds' }, leadTime: { zh: '8-16 天', en: '8-16 days', es: '8-16 días' }, warranty: { zh: '3 年', en: '3 years', es: '3 años' } },
      images: { main: '/images/products/sv-ai-face-pro.jpg', gallery: [] },
      seoTitle: '4G/5G AI Security Camera OEM', seoDesc: 'Face recognition 4G/5G camera',
      sortOrder: 3
    },
    {
      slug: 'ethan-bullet-4k-wdr',
      name: { zh: '乔安 双镜头全彩云台摄像头', en: 'Joaan Dual-Lens Full-Color PTZ Camera', es: 'Cámara PTZ Joaan de doble lente a todo color' },
      sku: 'JA-C10', categoryId: catAi!.id, price: 61.74, moq: 10, brand: '乔安',
      badge: '',
      summary: { zh: '乔安云台摄像头，双向视频通话，双光夜视，周界报警与 PIR 人体感应，IP66 防护。', en: 'Joaan PTZ camera with two-way video calling, dual-light night vision, perimeter alarm and PIR detection, IP66.', es: 'Cámara PTZ Joaan con videollamada bidireccional, visión nocturna de doble luz, alarma perimetral y PIR, IP66.' },
      highlights: [{ zh: '双光夜视', en: 'Dual-Light NV', es: 'Doble luz' }, { zh: 'IP66', en: 'IP66', es: 'IP66' }, { zh: '双向通话', en: 'Two-way Call', es: 'Bidireccional' }, { zh: '4G/5G + WiFi', en: '4G/5G + WiFi', es: '4G/5G + WiFi' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '防护等级', en: 'Protection', es: 'Protección' }, 'IP66']],
      logistics: { moq: { zh: '10 台', en: '10 pcs', es: '10 uds' }, leadTime: { zh: '7-14 天', en: '7-14 days', es: '7-14 días' }, warranty: { zh: '3 年', en: '3 years', es: '3 años' } },
      images: { main: '/images/products/sv-bullet-4k-wdr.jpg', gallery: [] },
      seoTitle: 'Dual-Lens PTZ Camera OEM', seoDesc: 'Full-color PTZ camera with 4G/5G',
      sortOrder: 4
    },
    {
      slug: 'ethan-mini-covert-2k',
      name: { zh: '乔安 JA-W1C 室内云台摄像头', en: 'Joaan JA-W1C Indoor PTZ Camera', es: 'Cámara PTZ interior Joaan JA-W1C' },
      sku: 'JA-W1C', categoryId: catIndoor!.id, price: 55.72, moq: 20, brand: '乔安',
      badge: 'sale',
      summary: { zh: '乔安 JA-W1C 室内云台摄像头，支持人脸识别与周界报警，WIFI 联网，适合室内家用。', en: 'Joaan JA-W1C indoor PTZ camera with face recognition, perimeter alarm, WiFi networking, ideal for indoor home use.', es: 'Cámara PTZ interior Joaan JA-W1C con reconocimiento facial, alarma perimetral, WiFi, ideal para uso doméstico.' },
      highlights: [{ zh: '室内家用', en: 'Indoor Home', es: 'Uso doméstico' }, { zh: '人脸识别', en: 'Face Recognition', es: 'Reconocimiento facial' }, { zh: '双光夜视', en: 'Dual-Light NV', es: 'Doble luz' }, { zh: 'WiFi', en: 'WiFi', es: 'WiFi' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '型号', en: 'Model', es: 'Modelo' }, 'JA-W1C']],
      logistics: { moq: { zh: '20 台', en: '20 pcs', es: '20 uds' }, leadTime: { zh: '5-12 天', en: '5-12 days', es: '5-12 días' }, warranty: { zh: '2 年', en: '2 years', es: '2 años' } },
      images: { main: '/images/products/sv-mini-covert-2k.jpg', gallery: [] },
      seoTitle: 'Indoor PTZ Camera WiFi OEM', seoDesc: 'Compact indoor PTZ camera with face recognition',
      sortOrder: 5
    },
    {
      slug: 'ethan-thermal-ai-640',
      name: { zh: '乔安 室外旋转监控摄像头', en: 'Joaan Outdoor Rotating Camera', es: 'Cámara Rotativa para Exterior Joaan' },
      sku: 'JA-OUTDOOR-ROT', categoryId: catAi!.id, price: 71.15, moq: 2, brand: '乔安',
      badge: 'new',
      summary: { zh: '乔安室外旋转监控摄像头，SD卡与云存储双存储，4G/5G流量卡与无线网络连接，IP66防护。', en: 'Joaan outdoor rotating camera with SD and cloud storage, 4G/5G SIM and wireless connectivity, IP66 protection.', es: 'Cámara rotativa para exterior Joaan con almacenamiento SD y en la nube, SIM 4G/5G y conexión inalámbrica, IP66.' },
      highlights: [{ zh: '周界报警', en: 'Perimeter Alarm', es: 'Alarma Perimetral' }, { zh: '录音功能', en: 'Audio Recording', es: 'Grabación de Audio' }, { zh: 'IP66防护', en: 'IP66', es: 'IP66' }, { zh: '4G/5G+WiFi', en: '4G/5G+WiFi', es: '4G/5G+WiFi' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '防护等级', en: 'Protection', es: 'Protección' }, 'IP66']],
      logistics: { moq: { zh: '2台', en: '2 pcs', es: '2 uds' }, leadTime: { zh: '15-25天', en: '15-25 days', es: '15-25 días' }, warranty: { zh: '3年', en: '3 years', es: '3 años' } },
      images: { main: '/images/products/sv-thermal-ai-640.jpg', gallery: [] },
      seoTitle: 'Outdoor Rotating Camera OEM', seoDesc: 'IP66 outdoor camera with 4G/5G',
      sortOrder: 6
    },
    {
      slug: 'ethan-360-fisheye-12mp',
      name: { zh: '乔安 变焦摄像头 JA-W19/JA-W11', en: 'Joaan Zoom Camera JA-W19/JA-W11', es: 'Cámara Zoom Joaan JA-W19/JA-W11' },
      sku: 'JA-W19', categoryId: catIp!.id, price: 72.18, moq: 10, brand: '乔安',
      badge: '',
      summary: { zh: '乔安变焦摄像头，4G 供网，双光夜视，周界报警，PIR 人体感应。', en: 'Joaan zoom camera with 4G network, dual-light night vision, perimeter alarm, PIR motion detection.', es: 'Cámara Zoom Joaan con red 4G, visión nocturna de doble luz, alarma perimetral, detección PIR.' },
      highlights: [{ zh: '4G', en: '4G', es: '4G' }, { zh: '双光夜视', en: 'Dual-light NV', es: 'Doble luz' }, { zh: '周界报警', en: 'Perimeter Alarm', es: 'Alarma Perimetral' }, { zh: 'PIR 人体感应', en: 'PIR Detection', es: 'Detección PIR' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '型号', en: 'Model', es: 'Modelo' }, 'JA-W19/JA-W11']],
      logistics: { moq: { zh: '10 台', en: '10 pcs', es: '10 uds' }, leadTime: { zh: '8-15 天', en: '8-15 days', es: '8-15 días' }, warranty: { zh: '2 年', en: '2 years', es: '2 años' } },
      images: { main: '/images/products/sv-360-fisheye-12mp.jpg', gallery: [] },
      seoTitle: 'Zoom Camera 4G OEM', seoDesc: 'Zoom camera with dual-light night vision',
      sortOrder: 7
    },
    {
      slug: 'ethan-solar-lte-cam',
      name: { zh: '乔安 网络室外全彩枪机 JA-731*RK', en: 'Joaan Network Outdoor Full-Color Bullet Camera JA-731*RK', es: 'Cámara Bala para Exterior a Todo Color en Red Joaan JA-731*RK' },
      sku: 'JA-731RK', categoryId: catOutdoor!.id, price: 57.19, moq: 5, brand: '乔安',
      badge: 'hot',
      summary: { zh: '乔安有线室外全彩枪机，本地硬盘存储，电源适配器或 PoE 供电，IP66 防护，4MP 清晰度。', en: 'Joaan wired outdoor full-color bullet camera with local hard disk storage, power adapter or PoE supply, IP66, 4MP.', es: 'Cámara bala cableada para exterior a todo color Joaan con almacenamiento en disco duro, alimentación por adaptador o PoE, IP66, 4MP.' },
      highlights: [{ zh: 'IP66', en: 'IP66', es: 'IP66' }, { zh: 'PoE', en: 'PoE', es: 'PoE' }, { zh: '4MP', en: '4MP', es: '4MP' }, { zh: 'H.265', en: 'H.265', es: 'H.265' }],
      details: [[{ zh: '品牌', en: 'Brand', es: 'Marca' }, { zh: '乔安', en: 'Joaan', es: 'Joaan' }], [{ zh: '清晰度', en: 'Resolution', es: 'Resolución' }, '4MP']],
      logistics: { moq: { zh: '5 台', en: '5 pcs', es: '5 uds' }, leadTime: { zh: '12-20 天', en: '12-20 days', es: '12-20 días' }, warranty: { zh: '2 年', en: '2 years', es: '2 años' } },
      images: { main: '/images/products/sv-solar-lte-cam.jpg', gallery: [] },
      seoTitle: 'Wired Bullet Camera PoE OEM', seoDesc: 'Outdoor full-color bullet camera with PoE',
      sortOrder: 8
    }
  ]

  for (const p of products) {
    await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: p })
  }
  console.log(`✓ ${products.length} 个产品创建成功`)

  // 4. 创建解决方案
  const solutions = [
    { slug: 'retail', name: { zh: '零售与商业', en: 'Retail & Commerce', es: 'Retail y comercio' }, description: { zh: '防盗、客流分析、收银监控与顾客行为分析。', en: 'Theft prevention, footfall analytics, and cashier monitoring.', es: 'Prevención de robos y análisis de tráfico.' }, icon: 'RC', image: '/images/solutions/solution-retail.jpg', productCount: '14', sortOrder: 1 },
    { slug: 'industrial', name: { zh: '工业与工厂', en: 'Industrial & Factory', es: 'Industrial' }, description: { zh: '7×24 产线监控、门禁联动与危险区域检测。', en: '24/7 production monitoring and hazard zone detection.', es: 'Monitoreo 24/7 y detección de zonas de riesgo.' }, icon: 'IF', image: '/images/solutions/solution-industrial.jpg', productCount: '18', sortOrder: 2 },
    { slug: 'residential', name: { zh: '住宅社区', en: 'Residential', es: 'Residencial' }, description: { zh: '智能家居联动、访客识别与周界防护。', en: 'Smart home integration and perimeter coverage.', es: 'Integración hogar inteligente y perímetro.' }, icon: 'RE', image: '/images/solutions/solution-residential.jpg', productCount: '10', sortOrder: 3 },
    { slug: 'construction', name: { zh: '建筑工地', en: 'Construction Site', es: 'Obra' }, description: { zh: '太阳能无线 + AI 监控与延时摄影。', en: 'Solar wireless cameras with AI and time-lapse.', es: 'Cámaras solares con IA para obras remotas.' }, icon: 'CS', image: '/images/solutions/solution-construction.jpg', productCount: '8', sortOrder: 4 },
    { slug: 'hotel', name: { zh: '酒店文旅', en: 'Hotel & Hospitality', es: 'Hotelería' }, description: { zh: '低调美观，覆盖大堂、停车场、走廊与资产防护。', en: 'Discreet analytics for lobbies, parking, and corridors.', es: 'Analítica discreta para hoteles.' }, icon: 'HH', image: '/images/solutions/solution-hotel.jpg', productCount: '12', sortOrder: 5 },
    { slug: 'parking', name: { zh: '停车与交通', en: 'Parking & Traffic', es: 'Estacionamiento' }, description: { zh: '车牌识别、车流统计与 24 小时周界监控。', en: 'LPR, vehicle counting, and perimeter surveillance.', es: 'LPR y conteo vehicular.' }, icon: 'PT', image: '/images/solutions/solution-parking.jpg', productCount: '9', sortOrder: 6 }
  ]
  for (const s of solutions) {
    await prisma.solution.upsert({ where: { slug: s.slug }, update: {}, create: s })
  }
  console.log(`✓ ${solutions.length} 个解决方案创建成功`)

  // 5. 创建客户反馈（先清除旧数据避免重复插入）
  const existingTestimonials = await prisma.testimonial.count()
  if (existingTestimonials === 0) {
    const testimonials = [
    { author: { zh: 'Marcus K.', en: 'Marcus K.', es: 'Marcus K.' }, role: { zh: '安防集成商 · 德国', en: 'Security Integrator, Germany', es: 'Integrador, Alemania' }, text: { zh: '我们为连锁零售项目订购了 500 台，画质稳定、安装简单。', en: 'We ordered 500 units for retail. Strong image quality and easy installation.', es: 'Pedimos 500 unidades para retail.' }, stars: 5, image: '/images/testimonials/testimonial-01.jpg', country: 'Germany', sortOrder: 1 },
    { author: { zh: 'Ahmed Al-Rashidi', en: 'Ahmed Al-Rashidi', es: 'Ahmed Al-Rashidi' }, role: { zh: '分销经理 · 阿联酋', en: 'Distribution Manager, UAE', es: 'Distribuidor, EAU' }, text: { zh: '作为分销商，品质和售后是关键。ETHAN 的 AI 系列已成为我们的主力产品线。', en: 'As a distributor, quality matters. ETHAN AI cameras are now our flagship line.', es: 'Las cámaras IA ETHAN son nuestra línea estrella.' }, stars: 5, image: '/images/testimonials/testimonial-02.jpg', country: 'UAE', sortOrder: 2 },
    { author: { zh: 'Claire T.', en: 'Claire T.', es: 'Claire T.' }, role: { zh: '品牌方 · 澳大利亚', en: 'Brand Owner, Australia', es: 'Marca, Australia' }, text: { zh: 'OEM 流程顺畅，贴牌产品按时到货并附带完整文档。', en: 'Smooth OEM process. Branded cameras arrived on time with full documentation.', es: 'OEM fluido. Entrega a tiempo.' }, stars: 5, image: '/images/testimonials/testimonial-03.jpg', country: 'Australia', sortOrder: 3 },
    { author: { zh: 'Park J.', en: 'Park J.', es: 'Park J.' }, role: { zh: '弱电工程商 · 韩国', en: 'ELV Contractor, South Korea', es: 'Contratista ELV, Corea' }, text: { zh: '在大型商超项目中部署超过 1200 台设备，远程运维便捷。', en: 'Deployed 1200+ units in a hypermarket project. Easy remote maintenance.', es: '1200+ unidades en centro comercial.' }, stars: 5, image: '/images/testimonials/testimonial-04.jpg', country: 'South Korea', sortOrder: 4 },
    { author: { zh: 'Fernando R.', en: 'Fernando R.', es: 'Fernando R.' }, role: { zh: '系统集成商 · 巴西', en: 'System Integrator, Brazil', es: 'Integrador, Brasil' }, text: { zh: '智慧城市项目采用 ETHAN 的 PTZ 与 AI 模组，通过 ONVIF 无缝接入。', en: 'Smart city project uses ETHAN PTZ and AI modules via ONVIF.', es: 'Proyecto ciudad inteligente con PTZ ETHAN.' }, stars: 5, image: '/images/testimonials/testimonial-05.jpg', country: 'Brazil', sortOrder: 5 },
    { author: { zh: 'Sophie L.', en: 'Sophie L.', es: 'Sophie L.' }, role: { zh: '跨境电商卖家 · 法国', en: 'Cross-border Seller, France', es: 'Vendedor transfronterizo, Francia' }, text: { zh: '在亚马逊和独立站销售 ETHAN 贴牌产品，包装设计精美。', en: 'Selling ETHAN branded products on Amazon and Shopify. Great packaging.', es: 'Venta de productos ETHAN en Amazon y Shopify.' }, stars: 4, image: '/images/testimonials/testimonial-06.jpg', country: 'France', sortOrder: 6 },
    { author: { zh: 'Lars W.', en: 'Lars W.', es: 'Lars W.' }, role: { zh: '酒店集团 IT · 瑞典', en: 'Hotel Group IT, Sweden', es: 'TI de Grupo Hotelero, Suecia' }, text: { zh: '为集团旗下 30 家酒店统一部署，隐蔽式设计完美融入装修。', en: 'Deployed across 30 hotels. Discreet design blends into lobby decor.', es: 'Despliegue en 30 hoteles.' }, stars: 5, image: '/images/testimonials/testimonial-07.jpg', country: 'Sweden', sortOrder: 7 },
    { author: { zh: 'David C.', en: 'David C.', es: 'David C.' }, role: { zh: '物流总监 · 美国', en: 'Logistics Director, USA', es: 'Director Logístico, EE.UU.' }, text: { zh: '仓库周界部署太阳能 4G 摄像头方案，免布线安装极大降低成本。', en: 'Solar 4G perimeter cameras for warehouse. No cabling needed.', es: 'Cámaras solares 4G perimetrales para almacén.' }, stars: 5, image: '/images/testimonials/testimonial-08.jpg', country: 'USA', sortOrder: 8 }
  ]
    for (const t of testimonials) {
      await prisma.testimonial.create({ data: t })
    }
    console.log(`✓ ${testimonials.length} 条客户反馈创建成功`)
  } else {
    console.log(`⚠ 已存在 ${existingTestimonials} 条客户反馈，跳过`)
  }

  // 6. 创建下载项（先清除旧数据避免重复插入）
  const existingDownloads = await prisma.download.count()
  if (existingDownloads === 0) {
    const ethanPtz = await prisma.product.findUnique({ where: { slug: 'ethan-4k-dome-pro' } })
    const ethanSolar = await prisma.product.findUnique({ where: { slug: 'ethan-ptz-360-ultra' } })
    const downloads = [
    { name: { zh: '乔安枪球联动摄像头 规格书', en: 'Qiaoan PTZ Linkage Camera Datasheet', es: 'Ficha Cámara PTZ Qiaoan' }, type: 'PDF' as const, fileUrl: '/downloads/Qiaoan-PTZ-Linkage.pdf', fileSize: '2.4 MB', version: 'v3.1', productId: ethanPtz?.id },
    { name: { zh: '乔安 G4S4 太阳能摄像头 规格书', en: 'Joaan G4S4 Solar Camera Datasheet', es: 'Ficha Cámara Solar Joaan G4S4' }, type: 'PDF' as const, fileUrl: '/downloads/Joaan-G4S4-Solar.pdf', fileSize: '3.1 MB', version: 'v2.8', productId: ethanSolar?.id },
    { name: { zh: '固件 v5.0.2 IP 系列', en: 'Firmware v5.0.2 IP Series', es: 'Firmware v5.0.2 IP' }, type: 'ZIP' as const, fileUrl: '/downloads/firmware-v5.0.2.zip', fileSize: '45 MB', version: 'v5.0.2' },
    { name: { zh: '安装与配置指南', en: 'Installation & Setup Guide', es: 'Guía de instalación' }, type: 'PDF' as const, fileUrl: '/downloads/installation-guide.pdf', fileSize: '8.2 MB', version: 'v4.0' }
  ]
    for (const d of downloads) {
      await prisma.download.create({ data: d })
    }
    console.log(`✓ ${downloads.length} 个下载项创建成功`)
  } else {
    console.log(`⚠ 已存在 ${existingDownloads} 个下载项，跳过`)
  }

  // 7. 创建站点设置
  const settings = [
    { key: 'siteName', value: { zh: 'ETHAN 安防', en: 'ETHAN Security', es: 'ETHAN Seguridad' } },
    { key: 'siteDescription', value: { zh: '专业 IP 摄像头 OEM/ODM 制造商', en: 'Professional IP Camera OEM/ODM Manufacturer', es: 'Fabricante OEM/ODM de cámaras IP' } },
    { key: 'contactEmail', value: 'sales@ethan-security.com' },
    { key: 'contactPhone', value: '+86-755-1234-5678' },
    { key: 'contactWhatsapp', value: '+8613800138000' },
    { key: 'address', value: { zh: '广东省深圳市', en: 'Shenzhen, Guangdong, China', es: 'Shenzhen, Guangdong, China' } }
  ]
  for (const s of settings) {
    await prisma.siteSetting.upsert({ where: { key: s.key }, update: {}, create: s })
  }
  console.log(`✓ ${settings.length} 项站点设置创建成功`)

  console.log('\n✅ 所有种子数据导入完成！')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
