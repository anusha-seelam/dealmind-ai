"""
Seed DealMind with demo user + NovaTech deal.
Run: python seed_data.py  (from backend/)
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database.db import init_db, AsyncSessionLocal
from app.models.deal import Deal
from app.models.user import User
from app.core.auth import hash_password
from app.services.hindsight_service import create_deal_bank
from sqlalchemy import select

DEMO_USER = {
    "id":            "user-demo-alex",
    "email":         "alex@dealmind.ai",
    "full_name":     "Alex Morgan",
    "hashed_password": hash_password("demo1234"),
}

DEMO_DEALS = [
    {
        "id":                  "deal-novatech-demo",
        "bank_id":             "deal-novatech-001",
        "salesperson_name":    "Alex Morgan",
        "customer_name":       "Sarah Chen",
        "customer_company":    "NovaTech",
        "customer_industry":   "Technology",
        "customer_role":       "CTO",
        "customer_email":      "sarah.chen@novatech.io",
        "title":               "Enterprise Analytics Platform",
        "value":               80000.0,
        "stage":               "Negotiation",
        "expected_close_days": 30,
        "product_service":     "Enterprise Analytics Platform — full suite with onboarding",
    },
    {
        "id":                  "deal-meridian-demo",
        "bank_id":             "deal-meridian-002",
        "salesperson_name":    "Alex Morgan",
        "customer_name":       "James Okafor",
        "customer_company":    "Meridian Finance",
        "customer_industry":   "Financial Services",
        "customer_role":       "VP of Operations",
        "customer_email":      "j.okafor@meridianfinance.com",
        "title":               "Compliance Automation Suite",
        "value":               120000.0,
        "stage":               "Proposal",
        "expected_close_days": 45,
        "product_service":     "Compliance Automation Suite",
    },
    {
        "id":                  "deal-greenleaf-demo",
        "bank_id":             "deal-greenleaf-003",
        "salesperson_name":    "Alex Morgan",
        "customer_name":       "Priya Sharma",
        "customer_company":    "GreenLeaf Healthcare",
        "customer_industry":   "Healthcare",
        "customer_role":       "IT Director",
        "customer_email":      "priya.sharma@greenleafhealth.org",
        "title":               "Patient Data Management System",
        "value":               55000.0,
        "stage":               "Discovery",
        "expected_close_days": 60,
        "product_service":     "Patient Data Management — HIPAA-compliant cloud solution",
    },
]


async def seed():
    print("Initialising database …")
    await init_db()

    async with AsyncSessionLocal() as db:
        # ── Demo user ──────────────────────────────────────────────────────────
        q = await db.execute(select(User).where(User.id == DEMO_USER["id"]))
        if not q.scalar_one_or_none():
            db.add(User(**DEMO_USER))
            await db.commit()
            print(f"  [OK] Demo user created: {DEMO_USER['email']} / demo1234")
        else:
            print(f"  [OK] Demo user already exists: {DEMO_USER['email']}")

        # ── Demo deals ─────────────────────────────────────────────────────────
        for data in DEMO_DEALS:
            q = await db.execute(select(Deal).where(Deal.id == data["id"]))
            if q.scalar_one_or_none():
                print(f"  ✓ Deal already exists: {data['customer_company']}")
                continue

            db.add(Deal(**data))
            await db.commit()
            ok = await create_deal_bank(
                bank_id=data["bank_id"],
                deal_title=data["title"],
                customer=data["customer_name"],
            )
            status = "[OK]" if ok else "[WARN] (Hindsight not running - OK for demo)"
            print(f"  {status} Seeded: {data['customer_company']} -- {data['title']}")

    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Seed complete!")
    print("  Login:  alex@dealmind.ai")
    print("  Pass:   demo1234")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    asyncio.run(seed())
