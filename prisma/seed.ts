import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.matchLog.deleteMany();
  await prisma.intern.deleteMany();
  await prisma.guide.deleteMany();

  // ── GUIDES ──────────────────────────────────────────────────────────────────

  const guides = await Promise.all([
    prisma.guide.create({
      data: {
        full_name: 'Rajesh Kumar',
        department: 'Manufacturing',
        expertise_domains: ['Manufacturing Engineering', 'Production', 'Lean Manufacturing', 'Assembly'].join(", "),
        required_skills: ['AutoCAD', 'SolidWorks', 'Lean Manufacturing', 'GD&T', 'Process Planning'].join(", "),
        preferred_intern_types: ['B.Tech', 'Diploma'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Dr. Priya Sharma',
        department: 'R&D',
        expertise_domains: ['Vehicle Dynamics', 'R&D', 'Powertrain Engineering', 'Simulation'].join(", "),
        required_skills: ['MATLAB', 'Python', 'FEA', 'ANSYS', 'Vehicle Simulation'].join(", "),
        preferred_intern_types: ['B.Tech'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Amit Patel',
        department: 'Quality',
        expertise_domains: ['Quality Engineering', 'Metrology', 'Statistical Quality Control', 'Inspection'].join(", "),
        required_skills: ['Six Sigma', 'FMEA', 'SPC', 'Minitab', 'Statistical Analysis'].join(", "),
        preferred_intern_types: ['B.Tech', 'Diploma'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Deepak Singh',
        department: 'IT',
        expertise_domains: ['Information Technology', 'Data Analytics', 'Digital Manufacturing', 'Automation'].join(", "),
        required_skills: ['Python', 'SQL', 'SAP', 'Power BI', 'Java'].join(", "),
        preferred_intern_types: ['B.Tech', 'Sponsored'].join(", "),
        max_capacity: 2,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Sunita Rao',
        department: 'HR',
        expertise_domains: ['Human Resources', 'Training and Development', 'Organizational Development', 'Talent Management'].join(", "),
        required_skills: ['HR Management', 'Recruitment', 'Excel', 'Communication', 'Payroll Systems'].join(", "),
        preferred_intern_types: ['MBA'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Vikram Mehta',
        department: 'Design',
        expertise_domains: ['Product Design', 'Body Engineering', 'CAD/CAM', 'Styling'].join(", "),
        required_skills: ['CATIA V5', 'SolidWorks', '3D Modeling', 'AutoCAD', 'GD&T'].join(", "),
        preferred_intern_types: ['B.Tech'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Anita Joshi',
        department: 'Testing',
        expertise_domains: ['Vehicle Testing', 'NVH Testing', 'Chassis Engineering', 'Durability'].join(", "),
        required_skills: ['NVH Testing', 'MATLAB', 'LabVIEW', 'Chassis Testing', 'Data Acquisition'].join(", "),
        preferred_intern_types: ['B.Tech', 'Diploma'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
    prisma.guide.create({
      data: {
        full_name: 'Sanjay Verma',
        department: 'Logistics',
        expertise_domains: ['Supply Chain', 'Logistics', 'Materials Management', 'Procurement'].join(", "),
        required_skills: ['SAP MM', 'Supply Chain Management', 'ERP', 'Excel', 'Inventory Control'].join(", "),
        preferred_intern_types: ['MBA', 'B.Tech'].join(", "),
        max_capacity: 3,
        //is_active: true,
      },
    }),
  ]);

  const [
    rajesh, priya, amit, deepak, sunitaRao, vikram, anita, sanjay
  ] = guides;

  console.log('✅ Created 8 guides');

  // ── INTERNS ──────────────────────────────────────────────────────────────────

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const future = (d: number) => new Date(now.getTime() + d * 86400000);

  // Active interns (assigned to guides)
  const arjun = await prisma.intern.create({
    data: {
      intern_id: 'INT001',
      full_name: 'Arjun Desai',
      //email: 'arjun.desai@vjti.ac.in',
      phone: '+91 98201 34567',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'VJTI Mumbai',
      branch: 'Mechanical Engineering',
      graduation_year: 2025,
      cgpa: 8.5,
      skills: ['AutoCAD', 'SolidWorks', 'Lean Manufacturing', 'GD&T'].join(", "),
      preferred_domain: 'Manufacturing Engineering',
      start_date: daysAgo(60),
      end_date: new Date(),
      duration_months: 6,
      status: 'Active',
      assigned_guide_id: rajesh.id,
    },
  });

  const priyaGupta = await prisma.intern.create({
    data: {
      intern_id: 'INT002',
      full_name: 'Priya Gupta',
      //email: 'priya.gupta@maeer.edu.in',
      phone: '+91 97301 45678',
      p_no: 'P12345',
      intern_type: 'Diploma',
      college: "MAEER's MIT Polytechnic Pune",
      branch: 'Mechanical Engineering',
      graduation_year: 2025,
      cgpa: 7.2,
      skills: ['AutoCAD', 'Process Planning', 'Lean Manufacturing'].join(", "),
      preferred_domain: 'Production',
      start_date: daysAgo(45),
      end_date: new Date(),
      duration_months: 4,
      status: 'Active',
      assigned_guide_id: rajesh.id,
    },
  });

  const rohit = await prisma.intern.create({
    data: {
      intern_id: 'INT003',
      full_name: 'Rohit Sharma',
      //email: 'rohit.sharma@coep.ac.in',
      phone: '+91 94201 56789',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'College of Engineering Pune',
      branch: 'Computer Science Engineering',
      graduation_year: 2025,
      cgpa: 9.1,
      skills: ['Python', 'SQL', 'Power BI', 'Java'].join(", "),
      preferred_domain: 'Data Analytics',
      start_date: daysAgo(50),
      end_date: new Date(),
      duration_months: 6,
      status: 'Active',
      assigned_guide_id: deepak.id,
    },
  });

  const neha = await prisma.intern.create({
    data: {
      intern_id: 'INT004',
      full_name: 'Neha Agarwal',
      //email: 'neha.agarwal@pict.edu',
      phone: '+91 93201 67890',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'Pune Institute of Computer Technology',
      branch: 'Information Technology',
      graduation_year: 2025,
      cgpa: 8.3,
      skills: ['Python', 'SAP', 'SQL', 'Power BI'].join(", "),
      preferred_domain: 'Information Technology',
      start_date: daysAgo(40),
      end_date: new Date(),
      duration_months: 4,
      status: 'Active',
      assigned_guide_id: deepak.id,
    },
  });

  const aakash = await prisma.intern.create({
    data: {
      intern_id: 'INT005',
      full_name: 'Aakash Kumar',
      //email: 'aakash.kumar@iitb.ac.in',
      phone: '+91 91201 78901',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'IIT Bombay',
      branch: 'Mechanical Engineering',
      graduation_year: 2025,
      cgpa: 8.9,
      skills: ['MATLAB', 'FEA', 'ANSYS', 'Vehicle Simulation', 'Python'].join(", "),
      preferred_domain: 'Vehicle Dynamics',
      start_date: daysAgo(55),
      end_date: new Date(),
      duration_months: 6,
      status: 'Active',
      assigned_guide_id: priya.id,

    },
  });

  const kavya = await prisma.intern.create({
    data: {
      intern_id: 'INT006',
      full_name: 'Kavya Nair',
      //email: 'kavya.nair@symbiosis.ac.in',
      phone: '+91 90201 89012',
      p_no: 'P12345',
      intern_type: 'MBA',
      college: 'Symbiosis Institute of Business Management',
      branch: 'Operations Management',
      graduation_year: 2025,
      cgpa: 7.8,
      skills: ['SAP MM', 'Supply Chain Management', 'Excel', 'ERP'].join(", "),
      preferred_domain: 'Supply Chain',
      start_date: daysAgo(30),
      end_date: new Date(),
      duration_months: 3,
      status: 'Active',
      assigned_guide_id: sanjay.id,
    },
  });

  const sneha = await prisma.intern.create({
    data: {
      intern_id: 'INT007',
      full_name: 'Sneha Patil',
      //email: 'sneha.patil@vnit.ac.in',
      phone: '+91 89201 90123',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'Visvesvaraya National Institute of Technology',
      branch: 'Electronics Engineering',
      graduation_year: 2025,
      cgpa: 8.0,
      skills: ['MATLAB', 'LabVIEW', 'Data Acquisition', 'NVH Testing'].join(", "),
      preferred_domain: 'Vehicle Testing',
      start_date: daysAgo(35),
      end_date: new Date(),
      duration_months: 4,
      status: 'Active',
      assigned_guide_id: anita.id,
    },
  });

  // Matched interns (pending HR confirmation)
  const nikhil = await prisma.intern.create({
    data: {
      intern_id: 'INT008',
      full_name: 'Nikhil Joshi',
      //email: 'nikhil.joshi@mit.ac.in',
      phone: '+91 88201 01234',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'MIT College of Engineering Pune',
      branch: 'Mechanical Engineering',
      graduation_year: 2025,
      cgpa: 8.7,
      skills: ['CATIA V5', 'SolidWorks', '3D Modeling', 'AutoCAD', 'GD&T'].join(", "),
      preferred_domain: 'Product Design',
      start_date: future(7),
      end_date: new Date(),
      duration_months: 6,
      status: 'Matched',
      assigned_guide_id: vikram.id,
    },
  });

  const divya = await prisma.intern.create({
    data: {
      intern_id: 'INT009',
      full_name: 'Divya Singh',
      //email: 'divya.singh@xlri.ac.in',
      phone: '+91 87201 12345',
      p_no: 'P12345',
      intern_type: 'MBA',
      college: 'XLRI Jamshedpur',
      branch: 'Human Resources Management',
      graduation_year: 2025,
      cgpa: 7.5,
      skills: ['HR Management', 'Recruitment', 'Communication', 'Excel', 'Payroll Systems'].join(", "),
      preferred_domain: 'Human Resources',
      start_date: future(5),
      end_date: new Date(),
      duration_months: 3,
      status: 'Matched',
      assigned_guide_id: sunitaRao.id,
    },
  });

  // Applied interns (no match logs needed — newly submitted)
  const meena = await prisma.intern.create({
    data: {
      intern_id: 'INT010',
      full_name: 'Meena Krishnan',
      //email: 'meena.krishnan@nitk.ac.in',
      phone: '+91 86201 23456',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'NIT Karnataka',
      branch: 'Production Engineering',
      graduation_year: 2025,
      cgpa: 7.9,
      skills: ['Six Sigma', 'FMEA', 'Statistical Analysis', 'Minitab'].join(", "),
      preferred_domain: 'Quality Engineering',
      start_date: future(14),
      end_date: new Date(),
      duration_months: 4,
      status: 'Applied',
    },
  });

  const ananya = await prisma.intern.create({
    data: {
      intern_id: 'INT011',
      full_name: 'Ananya Iyer',
      //email: 'ananya.iyer@cummins.edu.in',
      phone: '+91 85201 34567',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'Cummins College of Engineering Pune',
      branch: 'Mechanical Engineering',
      graduation_year: 2025,
      cgpa: 8.2,
      skills: ['CATIA V5', 'AutoCAD', 'GD&T', 'SolidWorks'].join(", "),
      preferred_domain: 'Body Engineering',
      start_date: future(10),
      end_date: new Date(),
      duration_months: 6,
      status: 'Applied',
    },
  });

  // Waitlisted interns (IT guide is at full capacity)
  const ravi = await prisma.intern.create({
    data: {
      intern_id: 'INT012',
      full_name: 'Ravi Tiwari',
      //email: 'ravi.tiwari@sppu.ac.in',
      phone: '+91 84201 45678',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'Savitribai Phule Pune University',
      branch: 'Computer Science Engineering',
      graduation_year: 2026,
      cgpa: 6.8,
      skills: ['Python', 'SQL', 'SAP', 'Java'].join(", "),
      preferred_domain: 'Digital Manufacturing',
      start_date: future(21),
      end_date: new Date(),
      duration_months: 4,
      status: 'Waitlisted',
    },
  });

  const pooja = await prisma.intern.create({
    data: {
      intern_id: 'INT013',
      full_name: 'Pooja Mishra',
      //email: 'pooja.mishra@govt-poly.edu.in',
      phone: '+91 83201 56789',
      p_no: 'P12345',
      intern_type: 'Diploma',
      college: 'Government Polytechnic Pune',
      branch: 'Computer Science',
      graduation_year: 2025,
      cgpa: 7.1,
      skills: ['Python', 'Power BI', 'Excel', 'SQL'].join(", "),
      preferred_domain: 'Data Analytics',
      start_date: future(14),
      end_date: new Date(),
      duration_months: 3,
      status: 'Waitlisted',
    },
  });

  // Allotted interns
  const vikramChauhan = await prisma.intern.create({
    data: {
      intern_id: 'INT014',
      full_name: 'Vikram Chauhan',
      //email: 'vikram.chauhan@walchand.ac.in',
      phone: '+91 82201 67890',
      p_no: 'P12345',
      intern_type: 'B.Tech',
      college: 'Walchand College of Engineering',
      branch: 'Mechanical Engineering',
      graduation_year: 2024,
      cgpa: 9.0,
      skills: ['AutoCAD', 'SolidWorks', 'Lean Manufacturing', 'GD&T', 'Process Planning'].join(", "),
      preferred_domain: 'Manufacturing Engineering',
      start_date: daysAgo(180),
      end_date: new Date(),
      duration_months: 6,
      status: 'Allotted',
      assigned_guide_id: null,
    },
  });

  const sunitaBansal = await prisma.intern.create({
    data: {
      intern_id: 'INT015',
      full_name: 'Sunita Bansal',
      //email: 'sunita.bansal@imsindia.com',
      phone: '+91 81201 78901',
      p_no: 'P12345',
      intern_type: 'MBA',
      college: 'IMS Pune',
      branch: 'Operations Management',
      graduation_year: 2024,
      cgpa: 7.3,
      skills: ['Supply Chain Management', 'SAP MM', 'ERP', 'Inventory Control', 'Excel'].join(", "),
      preferred_domain: 'Logistics',
      start_date: daysAgo(150),
      end_date: new Date(),
      duration_months: 3,
      status: 'Allotted',
      assigned_guide_id: null,
    },
  });

  console.log('✅ Created 15 interns');

  // ── MATCH LOGS ───────────────────────────────────────────────────────────────

  await prisma.matchLog.createMany({
    data: [
      // Active intern match logs (confirmed)
      {
        intern_id: arjun.id,
        guide_id: rajesh.id,
        match_score: 0.8900,
        matched_at: daysAgo(62),
        confirmed_at: daysAgo(61),
        notes: 'Strong manufacturing skill set. Confirmed by HR.',
      },
      {
        intern_id: priyaGupta.id,
        guide_id: rajesh.id,
        match_score: 0.7120,
        matched_at: daysAgo(47),
        confirmed_at: daysAgo(46),
        notes: 'Diploma candidate, good AutoCAD proficiency.',
      },
      {
        intern_id: rohit.id,
        guide_id: deepak.id,
        match_score: 0.9140,
        matched_at: daysAgo(52),
        confirmed_at: daysAgo(51),
        notes: 'Excellent Python and SQL skills. Top match.',
      },
      {
        intern_id: neha.id,
        guide_id: deepak.id,
        match_score: 0.8200,
        matched_at: daysAgo(42),
        confirmed_at: daysAgo(41),
        notes: 'IT background aligns well.',
      },
      {
        intern_id: aakash.id,
        guide_id: priya.id,
        match_score: 0.9360,
        matched_at: daysAgo(57),
        confirmed_at: daysAgo(56),
        notes: 'IIT background, strong simulation skills. Excellent fit for R&D.',
      },
      {
        intern_id: kavya.id,
        guide_id: sanjay.id,
        match_score: 0.8600,
        matched_at: daysAgo(32),
        confirmed_at: daysAgo(31),
        notes: 'MBA Operations with SAP MM experience.',
      },
      {
        intern_id: sneha.id,
        guide_id: anita.id,
        match_score: 0.8400,
        matched_at: daysAgo(37),
        confirmed_at: daysAgo(36),
        notes: 'NVH testing skills match guide requirements.',
      },
      // Matched intern logs (pending confirmation)
      {
        intern_id: nikhil.id,
        guide_id: vikram.id,
        match_score: 0.9280,
        matched_at: daysAgo(1),
        confirmed_at: null,
        notes: null,
      },
      {
        intern_id: divya.id,
        guide_id: sunitaRao.id,
        match_score: 0.8750,
        matched_at: daysAgo(2),
        confirmed_at: null,
        notes: null,
      },
      // Waitlisted — log best possible match even if guide is full
      {
        intern_id: ravi.id,
        guide_id: deepak.id,
        match_score: 0.7840,
        matched_at: daysAgo(10),
        confirmed_at: null,
        notes: 'Waitlisted — IT guide at full capacity.',
      },
      {
        intern_id: pooja.id,
        guide_id: deepak.id,
        match_score: 0.7020,
        matched_at: daysAgo(9),
        confirmed_at: null,
        notes: 'Waitlisted — IT guide at full capacity.',
      },
      // Allotted intern logs
      {
        intern_id: vikramChauhan.id,
        guide_id: rajesh.id,
        match_score: 0.9500,
        matched_at: daysAgo(185),
        confirmed_at: daysAgo(184),
        Allotted_at: daysAgo(5),
        notes: 'Successfully Allotted 6-month internship. Excellent performance.',
      },
      {
        intern_id: sunitaBansal.id,
        guide_id: sanjay.id,
        match_score: 0.8300,
        matched_at: daysAgo(155),
        confirmed_at: daysAgo(154),
        Allotted_at: daysAgo(5),
        notes: 'Allotted logistics Project with good outcomes.',
      },
    ],
  });

  console.log('✅ Created match logs');
  console.log('🎉 Seeding Allotted!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

