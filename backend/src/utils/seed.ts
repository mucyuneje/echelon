// ============================================================
// SEED SCRIPT — generates realistic dummy candidates
// following the official Umurava Talent Profile Schema
// Run: npm run seed
// ============================================================

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Candidate } from "../models/candidate.model";
import { User } from "../models/user.model";
import { Job } from "../models/job.model";
import { extractCandidateFeatures } from "../services/scoring.service";
import { TalentProfile } from "../types";

const SAMPLE_CANDIDATES: TalentProfile[] = [
  {
    firstName: "Amina",
    lastName: "Nkurunziza",
    email: "amina.nkurunziza@email.com",
    headline: "Senior Backend Engineer — Node.js & AI Systems",
    bio: "Passionate backend engineer with 6+ years building scalable APIs and AI-powered systems.",
    location: "Kigali, Rwanda",
    skills: [
      { name: "Node.js", level: "Expert", yearsOfExperience: 6 },
      { name: "TypeScript", level: "Advanced", yearsOfExperience: 4 },
      { name: "MongoDB", level: "Advanced", yearsOfExperience: 5 },
      { name: "Python", level: "Intermediate", yearsOfExperience: 3 },
      { name: "Docker", level: "Intermediate", yearsOfExperience: 2 },
      { name: "Gemini API", level: "Intermediate", yearsOfExperience: 1 },
    ],
    languages: [
      { name: "English", proficiency: "Fluent" },
      { name: "Kinyarwanda", proficiency: "Native" },
    ],
    experience: [
      {
        company: "Andela",
        role: "Senior Backend Engineer",
        startDate: "2021-03",
        endDate: "Present",
        description: "Built microservices architecture serving 2M+ users. Led a team of 4 engineers.",
        technologies: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS"],
        isCurrent: true,
      },
      {
        company: "Klab Rwanda",
        role: "Backend Developer",
        startDate: "2018-06",
        endDate: "2021-02",
        description: "Developed REST APIs for fintech applications used across East Africa.",
        technologies: ["Node.js", "MongoDB", "Express"],
        isCurrent: false,
      },
    ],
    education: [
      {
        institution: "University of Rwanda",
        degree: "Bachelor's",
        fieldOfStudy: "Computer Science",
        startYear: 2014,
        endYear: 2018,
      },
    ],
    certifications: [
      { name: "AWS Certified Developer - Associate", issuer: "Amazon", issueDate: "2022-05" },
      { name: "MongoDB Professional", issuer: "MongoDB", issueDate: "2021-09" },
    ],
    projects: [
      {
        name: "AI-Powered Recruitment Platform",
        description: "Built a full-stack AI recruitment tool using Gemini API to screen and rank 500+ candidates.",
        technologies: ["Node.js", "TypeScript", "Gemini API", "MongoDB", "Next.js"],
        role: "Lead Backend Engineer",
        link: "https://github.com/amina/ai-recruitment",
        startDate: "2023-10",
        endDate: "2024-02",
      },
      {
        name: "Fintech Payment Gateway",
        description: "Designed a multi-currency payment API for African markets, processing $2M+ monthly.",
        technologies: ["Node.js", "PostgreSQL", "Redis", "Stripe"],
        role: "Backend Engineer",
        startDate: "2022-01",
        endDate: "2022-08",
      },
    ],
    availability: { status: "Open to Opportunities", type: "Full-time" },
    socialLinks: {
      linkedin: "https://linkedin.com/in/aminankurunziza",
      github: "https://github.com/amina-nk",
    },
  },
  {
    firstName: "David",
    lastName: "Okafor",
    email: "david.okafor@techmail.com",
    headline: "Full-Stack Developer — React & Python",
    bio: "Full-stack developer with strong frontend skills and growing interest in AI/ML.",
    location: "Lagos, Nigeria",
    skills: [
      { name: "React", level: "Expert", yearsOfExperience: 5 },
      { name: "Python", level: "Advanced", yearsOfExperience: 4 },
      { name: "JavaScript", level: "Expert", yearsOfExperience: 6 },
      { name: "Node.js", level: "Intermediate", yearsOfExperience: 2 },
      { name: "TensorFlow", level: "Beginner", yearsOfExperience: 1 },
    ],
    languages: [{ name: "English", proficiency: "Native" }],
    experience: [
      {
        company: "Flutterwave",
        role: "Full-Stack Developer",
        startDate: "2020-04",
        endDate: "Present",
        description: "Built dashboard applications processing financial transactions for 3M+ merchants.",
        technologies: ["React", "Python", "FastAPI", "PostgreSQL"],
        isCurrent: true,
      },
      {
        company: "Freelance",
        role: "Web Developer",
        startDate: "2018-01",
        endDate: "2020-03",
        description: "Delivered 20+ client projects across e-commerce and media sectors.",
        technologies: ["React", "Node.js", "MongoDB"],
        isCurrent: false,
      },
    ],
    education: [
      {
        institution: "University of Lagos",
        degree: "Bachelor's",
        fieldOfStudy: "Software Engineering",
        startYear: 2014,
        endYear: 2018,
      },
    ],
    certifications: [],
    projects: [
      {
        name: "ML Fraud Detection Dashboard",
        description: "Real-time fraud detection dashboard with ML model integration.",
        technologies: ["React", "Python", "TensorFlow", "FastAPI"],
        role: "Full-Stack Developer",
        startDate: "2023-06",
        endDate: "2023-12",
      },
    ],
    availability: { status: "Available", type: "Full-time" },
    socialLinks: { linkedin: "https://linkedin.com/in/davidokafor", github: "https://github.com/dokafor" },
  },
  {
    firstName: "Fatima",
    lastName: "Al-Rashidi",
    email: "fatima.rashidi@devmail.com",
    headline: "AI/ML Engineer — LLMs & Data Science",
    bio: "Specialized in building production-grade LLM applications and data pipelines.",
    location: "Nairobi, Kenya",
    skills: [
      { name: "Python", level: "Expert", yearsOfExperience: 7 },
      { name: "TensorFlow", level: "Advanced", yearsOfExperience: 4 },
      { name: "PyTorch", level: "Advanced", yearsOfExperience: 3 },
      { name: "LangChain", level: "Advanced", yearsOfExperience: 2 },
      { name: "Gemini API", level: "Advanced", yearsOfExperience: 1 },
      { name: "SQL", level: "Advanced", yearsOfExperience: 5 },
      { name: "Node.js", level: "Beginner", yearsOfExperience: 1 },
    ],
    languages: [
      { name: "English", proficiency: "Fluent" },
      { name: "Arabic", proficiency: "Native" },
      { name: "Swahili", proficiency: "Conversational" },
    ],
    experience: [
      {
        company: "Safaricom",
        role: "Senior AI Engineer",
        startDate: "2022-01",
        endDate: "Present",
        description: "Built NLP systems for M-Pesa customer service, reducing support tickets by 40%.",
        technologies: ["Python", "TensorFlow", "Google Cloud AI", "BigQuery"],
        isCurrent: true,
      },
      {
        company: "IBM Africa",
        role: "Data Scientist",
        startDate: "2018-09",
        endDate: "2021-12",
        description: "Developed predictive models for enterprise clients across 8 African countries.",
        technologies: ["Python", "R", "Spark", "IBM Watson"],
        isCurrent: false,
      },
    ],
    education: [
      {
        institution: "University of Nairobi",
        degree: "Master's",
        fieldOfStudy: "Computer Science (AI Specialization)",
        startYear: 2016,
        endYear: 2018,
      },
      {
        institution: "Cairo University",
        degree: "Bachelor's",
        fieldOfStudy: "Mathematics",
        startYear: 2012,
        endYear: 2016,
      },
    ],
    certifications: [
      { name: "Google Professional ML Engineer", issuer: "Google", issueDate: "2023-03" },
      { name: "TensorFlow Developer Certificate", issuer: "Google", issueDate: "2021-07" },
    ],
    projects: [
      {
        name: "LLM-Powered HR Screening System",
        description: "Built an AI system using Gemini API to screen 10,000+ candidates monthly for a Fortune 500 client.",
        technologies: ["Python", "Gemini API", "LangChain", "FastAPI", "MongoDB"],
        role: "Lead AI Engineer",
        link: "https://github.com/fatima/hr-screening",
        startDate: "2023-08",
        endDate: "2024-01",
      },
      {
        name: "Swahili NLP Toolkit",
        description: "Open-source NLP library for East African languages with 500+ GitHub stars.",
        technologies: ["Python", "PyTorch", "HuggingFace"],
        role: "Creator",
        link: "https://github.com/fatima/swahili-nlp",
        startDate: "2022-05",
        endDate: "2022-11",
      },
    ],
    availability: { status: "Open to Opportunities", type: "Contract" },
    socialLinks: {
      linkedin: "https://linkedin.com/in/fatimarashidi",
      github: "https://github.com/fatima-ai",
    },
  },
  {
    firstName: "Jean-Pierre",
    lastName: "Habimana",
    email: "jp.habimana@codemail.rw",
    headline: "Junior Backend Developer — Node.js",
    location: "Kigali, Rwanda",
    skills: [
      { name: "Node.js", level: "Intermediate", yearsOfExperience: 2 },
      { name: "JavaScript", level: "Intermediate", yearsOfExperience: 2 },
      { name: "MongoDB", level: "Beginner", yearsOfExperience: 1 },
      { name: "React", level: "Beginner", yearsOfExperience: 1 },
    ],
    languages: [
      { name: "English", proficiency: "Conversational" },
      { name: "Kinyarwanda", proficiency: "Native" },
      { name: "French", proficiency: "Fluent" },
    ],
    experience: [
      {
        company: "Rwanda Tech Hub",
        role: "Junior Developer",
        startDate: "2022-09",
        endDate: "Present",
        description: "Developed backend features for a local e-commerce platform.",
        technologies: ["Node.js", "MongoDB", "Express"],
        isCurrent: true,
      },
    ],
    education: [
      {
        institution: "Rwanda Coding Academy",
        degree: "Diploma",
        fieldOfStudy: "Software Development",
        startYear: 2021,
        endYear: 2022,
      },
    ],
    certifications: [],
    projects: [
      {
        name: "Student Management System",
        description: "A web app to manage student records for a local school.",
        technologies: ["Node.js", "Express", "MongoDB", "HTML/CSS"],
        role: "Developer",
        startDate: "2022-06",
        endDate: "2022-08",
      },
    ],
    availability: { status: "Available", type: "Full-time" },
    socialLinks: { github: "https://github.com/jphabimana" },
  },
  {
    firstName: "Sophia",
    lastName: "Mensah",
    email: "sophia.mensah@techgh.com",
    headline: "DevOps Engineer — Cloud & Kubernetes",
    location: "Accra, Ghana",
    skills: [
      { name: "Kubernetes", level: "Advanced", yearsOfExperience: 4 },
      { name: "Docker", level: "Expert", yearsOfExperience: 5 },
      { name: "AWS", level: "Advanced", yearsOfExperience: 4 },
      { name: "Terraform", level: "Advanced", yearsOfExperience: 3 },
      { name: "Python", level: "Intermediate", yearsOfExperience: 3 },
      { name: "Node.js", level: "Beginner", yearsOfExperience: 1 },
      { name: "CI/CD", level: "Expert", yearsOfExperience: 5 },
    ],
    languages: [{ name: "English", proficiency: "Native" }],
    experience: [
      {
        company: "Jumia",
        role: "DevOps Engineer",
        startDate: "2020-03",
        endDate: "Present",
        description: "Managed Kubernetes clusters handling 50M+ daily requests across 11 African countries.",
        technologies: ["Kubernetes", "AWS", "Terraform", "Jenkins"],
        isCurrent: true,
      },
      {
        company: "MTN Ghana",
        role: "Systems Engineer",
        startDate: "2018-01",
        endDate: "2020-02",
        description: "Maintained telecom infrastructure and migrated services to cloud.",
        technologies: ["Linux", "Docker", "Bash", "Ansible"],
        isCurrent: false,
      },
    ],
    education: [
      {
        institution: "KNUST",
        degree: "Bachelor's",
        fieldOfStudy: "Electrical Engineering",
        startYear: 2014,
        endYear: 2018,
      },
    ],
    certifications: [
      { name: "CKA - Certified Kubernetes Administrator", issuer: "CNCF", issueDate: "2022-10" },
      { name: "AWS Solutions Architect - Professional", issuer: "Amazon", issueDate: "2021-04" },
    ],
    projects: [
      {
        name: "Multi-Region Kubernetes Platform",
        description: "Designed a self-healing Kubernetes platform deployed across 3 AWS regions.",
        technologies: ["Kubernetes", "Terraform", "AWS", "Prometheus", "Grafana"],
        role: "Lead DevOps Engineer",
        startDate: "2021-06",
        endDate: "2022-01",
      },
    ],
    availability: { status: "Open to Opportunities", type: "Full-time" },
    socialLinks: { linkedin: "https://linkedin.com/in/sophiamensah" },
  },
];

const SAMPLE_JOB = {
  title: "Senior Backend Engineer",
  company: "Umurava Africa",
  description: `We are looking for a Senior Backend Engineer to join our growing team.

Requirements:
- 4+ years of experience with Node.js and TypeScript
- Strong knowledge of MongoDB and database design
- Experience with REST API design and development
- Familiarity with AI/ML APIs (Gemini, OpenAI, etc.) is a strong plus
- Experience with cloud platforms (AWS, GCP, or Azure)
- Docker and containerization experience preferred

Responsibilities:
- Design and build scalable backend services
- Lead technical design discussions
- Mentor junior developers
- Integrate AI capabilities into our platform

Nice to have:
- Experience with LLM prompt engineering
- Knowledge of African fintech landscape
- Open source contributions`,
  location: "Kigali, Rwanda (Remote-friendly)",
  jobType: "Full-time" as const,
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✅ Connected to MongoDB");

    // Clear existing seed data
    await Candidate.deleteMany({ source: "umurava_profile" });
    console.log("🗑️  Cleared existing candidates");

    // Create admin user if not exists
    let admin = await User.findOne({ email: "admin@umurava.africa" });
    if (!admin) {
      admin = await User.create({
        name: "Umurava Admin",
        email: "admin@umurava.africa",
        password: "Admin@123456",
        role: "admin",
      });
      console.log("👤 Admin user created: admin@umurava.africa / Admin@123456");
    }

    // Create demo job
    let job = await Job.findOne({ title: SAMPLE_JOB.title, company: SAMPLE_JOB.company });
    if (!job) {
      job = await Job.create({ ...SAMPLE_JOB, createdBy: admin._id });
      console.log(`💼 Demo job created: "${SAMPLE_JOB.title}"`);
    }

    // Seed candidates
    const candidateDocs = SAMPLE_CANDIDATES.map((profile) => ({
      source: "umurava_profile" as const,
      profile,
      features: extractCandidateFeatures(profile),
      jobId: job!._id,
    }));

    await Candidate.insertMany(candidateDocs);
    console.log(`✅ ${SAMPLE_CANDIDATES.length} candidates seeded`);

    console.log("\n🎉 Seed complete! You can now:");
    console.log("   POST /api/auth/login → { email: 'admin@umurava.africa', password: 'Admin@123456' }");
    console.log(`   POST /api/screen/run/${job._id} → Run full AI screening\n`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

seed();
