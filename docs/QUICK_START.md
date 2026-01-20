# 🚀 Quick Start Guide - Docker Desktop

## Prerequisites

✅ **Docker Desktop** ต้องเปิดอยู่

ตรวจสอบว่า Docker ทำงาน:
```bash
docker info
```

## วิธีที่ 1: ใช้ Script (ง่ายที่สุด)

### Development Mode
```bash
# ให้สิทธิ์ execute
chmod +x docker-start.sh

# รัน script
./docker-start.sh
# เลือก 1 สำหรับ Development
```

### Production Mode
```bash
./docker-start.sh
# เลือก 2 สำหรับ Production
```

## วิธีที่ 2: ใช้ Make (แนะนำ)

### Development Mode
```bash
make dev
```

### Production Mode
```bash
make prod
```

### คำสั่งอื่นๆ
```bash
make help          # ดูคำสั่งทั้งหมด
make down          # หยุด services
make logs          # ดู logs
make init-db       # Setup database (ครั้งแรก)
make seed          # Seed database
make prisma-studio # เปิด Prisma Studio (GUI สำหรับดู/แก้ไขข้อมูลใน database)
```

## วิธีที่ 3: ใช้ Docker Compose โดยตรง

### Development Mode
```bash
docker-compose -f docker-compose.dev.yml up
```

### Production Mode
```bash
docker-compose up -d
```

## 📋 Setup Database (ครั้งแรก)

หลังจากรัน services แล้ว ต้อง setup database:

```bash
# วิธีที่ 1: ใช้ script
chmod +x docker-init.sh
./docker-init.sh

# วิธีที่ 2: ใช้ make
make init-db

# วิธีที่ 3: ทำเอง
docker-compose exec api sh -c "cd prisma && npm install && npx prisma generate"
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npm run db:seed
```

## 🌐 URLs

หลังรันเสร็จ:

- **API**: http://localhost:3000
- **Client Portal**: http://localhost:3001  
- **Admin Portal**: http://localhost:3002
- **Swagger Docs**: http://localhost:3000/api/docs
- **Prisma Studio** (Database GUI): http://localhost:5555

## 🔐 Login Credentials

หลัง seed database:

**Super Admin:**
- URL: http://localhost:3002/login
- Email: `admin@ydm-platform.com`
- Password: `SuperAdmin123!`

**Tenant Admin:**
- URL: http://localhost:3001/login
- Email: `admin@acme-corp.com`
- Password: `Admin123!`

## 🛠️ Troubleshooting

### Docker ไม่ทำงาน
```bash
# ตรวจสอบ
docker info

# ถ้า error ให้เปิด Docker Desktop
```

### Port ถูกใช้งานแล้ว
```bash
# ตรวจสอบ port
lsof -i :3000
lsof -i :5432

# หรือเปลี่ยน port ใน docker-compose.yml
```

### Database Connection Error
```bash
# Restart PostgreSQL
docker-compose restart postgres

# ตรวจสอบ logs
docker-compose logs postgres
```

### ลบทุกอย่างและเริ่มใหม่
```bash
make clean
make dev
make init-db
```

## 📝 คำสั่งที่ใช้บ่อย

```bash
# ดู logs
make logs          # Production
make logs-dev      # Development

# Restart
make restart

# Stop
make down

# Clean everything
make clean
```

## 💡 Tips

1. **Development mode** - มี hot reload, เหมาะสำหรับพัฒนา
2. **Production mode** - Optimized build, เหมาะสำหรับทดสอบ production
3. ใช้ `make help` เพื่อดูคำสั่งทั้งหมด
4. Database data จะเก็บใน Docker volume (ไม่หายเมื่อ restart)

---

**พร้อมใช้งานแล้ว! 🎉**
