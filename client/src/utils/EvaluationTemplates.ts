import * as XLSX from 'xlsx';

// 1. Intern Master Dummy Data
export const internMasterData = [
  {
    'P No': '106245',
    'Full Name': 'Rahul Sharma',
    'Phone': '9876543210',
    'Bachelor Degree Type': 'B.Tech',
    'College': 'ABC College',
    'Bachelor Stream': 'Computer Science',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '82.5',
    'Skills': 'React, Node, SQL',
    'Preferred Domain': 'Web Development',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
  {
    'P No': '106246',
    'Full Name': 'Sneha Patil',
    'Phone': '9876543211',
    'Bachelor Degree Type': 'M.Tech',
    'College': 'XYZ College',
    'Bachelor Stream': 'Mechanical',
    'Department Name': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '78.9',
    'Skills': 'Process Design, CAD',
    'Preferred Domain': 'Operations',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Guide P No': 'G5002',
    'Project Required': 'No',
  },
  {
    'P No': '106247',
    'Full Name': 'Amit Kumar',
    'Phone': '9876543212',
    'Bachelor Degree Type': 'B.E.',
    'College': 'MIT Pune',
    'Bachelor Stream': 'Information Technology',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '85.2',
    'Skills': 'Python, PyTorch',
    'Preferred Domain': 'AI Research',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
  {
    'P No': '106248',
    'Full Name': 'Priya Desai',
    'Phone': '9876543213',
    'Bachelor Degree Type': 'MBA',
    'College': 'COEP',
    'Bachelor Stream': 'Human Resources',
    'Department Name': 'Support',
    'Graduation Year': 2026,
    'Bachelor Percentage': '91.0',
    'Skills': 'Talent Acquisition',
    'Preferred Domain': 'HR Ops',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Guide P No': 'G5002',
    'Project Required': 'No',
  },
  {
    'P No': '106249',
    'Full Name': 'Rohit Pawar',
    'Phone': '9876543214',
    'Bachelor Degree Type': 'B.Tech',
    'College': 'PCCOE',
    'Bachelor Stream': 'Computer Science',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '75.4',
    'Skills': 'Angular, Java',
    'Preferred Domain': 'Full Stack',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
  {
    'P No': '106250',
    'Full Name': 'Neha Joshi',
    'Phone': '9876543215',
    'Bachelor Degree Type': 'B.E.',
    'College': 'DY Patil',
    'Bachelor Stream': 'Electrical',
    'Department Name': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '88.1',
    'Skills': 'Power Systems',
    'Preferred Domain': 'Operations',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Guide P No': 'G5002',
    'Project Required': 'No',
  },
  {
    'P No': '106251',
    'Full Name': 'Akash More',
    'Phone': '9876543216',
    'Bachelor Degree Type': 'B.Tech',
    'College': 'JSPM',
    'Bachelor Stream': 'Information Technology',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '80.0',
    'Skills': 'Python, Flask',
    'Preferred Domain': 'Backend Development',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
  {
    'P No': '106252',
    'Full Name': 'Pooja Kulkarni',
    'Phone': '9876543217',
    'Bachelor Degree Type': 'B.E.',
    'College': 'MIT WPU',
    'Bachelor Stream': 'Computer Science',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '83.2',
    'Skills': 'React, CSS',
    'Preferred Domain': 'Frontend',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
  {
    'P No': '106253',
    'Full Name': 'Sagar Patil',
    'Phone': '9876543218',
    'Bachelor Degree Type': 'B.E.',
    'College': 'COEP',
    'Bachelor Stream': 'Mechanical',
    'Department Name': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '72.0',
    'Skills': 'AutoCAD, SolidWorks',
    'Preferred Domain': 'Operations',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Guide P No': 'G5002',
    'Project Required': 'No',
  },
  {
    'P No': '106254',
    'Full Name': 'Anjali Jadhav',
    'Phone': '9876543219',
    'Bachelor Degree Type': 'B.Tech',
    'College': 'VIIT',
    'Bachelor Stream': 'Computer Engineering',
    'Department Name': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '89.5',
    'Skills': 'Python, Django',
    'Preferred Domain': 'Web Development',
    'DOJ': '2026-06-01',
    'Duration Months': 3,
    'DOL': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Guide P No': 'G5001',
    'Project Required': 'Yes',
  },
];

const pNos = internMasterData.map(d => d['P No']);

// Helper to generate 20 weekdays in June 2026
const getWorkingDays = (): string[] => {
  const dates: string[] = [];
  const weekdays = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26];
  for (const day of weekdays) {
    const dayStr = String(day).padStart(2, '0');
    dates.push(`${dayStr}-06-2026`);
  }
  return dates;
};

// 2. Generate Smart Card Dummy Data
export const generateSmartCardData = () => {
  const dates = getWorkingDays();
  const rows: any[] = [];
  for (const pNo of pNos) {
    for (const date of dates) {
      const inHour = 8 + (Math.random() > 0.85 ? 1 : 0);
      const inMinute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const outHour = 17 + (Math.random() > 0.85 ? 1 : 0);
      const outMinute = String(Math.floor(Math.random() * 60)).padStart(2, '0');

      rows.push({
        'P No': pNo,
        'Date': date,
        'In Time': `${String(inHour).padStart(2, '0')}:${inMinute}`,
        'Out Time': `${String(outHour).padStart(2, '0')}:${outMinute}`,
      });
    }
  }
  return rows;
};

// 3. Generate Daily Attendance Dummy Data
export const generateDailyAttendanceData = () => {
  const dates = getWorkingDays();
  const rows: any[] = [];
  for (const intern of internMasterData) {
    for (let idx = 0; idx < dates.length; idx++) {
      const date = dates[idx];
      const isBackfilled = idx >= 15 && Math.random() > 0.5;

      let submissionTime = `${date} 17:20`;
      if (isBackfilled) {
        const dateParts = date.split('-');
        const day = parseInt(dateParts[0]) + 5;
        const formattedDay = String(day).padStart(2, '0');
        submissionTime = `${formattedDay}-${dateParts[1]}-${dateParts[2]} 09:00`;
      }

      rows.push({
        'P No': intern['P No'],
        'Employee Name': intern['Full Name'],
        'Date': date,
        'Department': intern['Department Name'],
        'Attendance Status': 'Present',
        'Report Submitted': 'Yes',
        'Submission Time': submissionTime,
        'Remarks': 'On Time',
      });
    }
  }
  return rows;
};

// 4. Generate Guide Feedback Dummy Data
export const generateGuideFeedbackData = () => {
  return internMasterData.map(intern => {
    const row: any = {
      'Guide Name': intern['Guide Name'],
      'Dept.Name': intern['Department Name'],
      'P.No': intern['P No'],
      'Intern Name': intern['Full Name'],
    };
    let total = 0;
    for (let q = 5; q <= 19; q++) {
      const score = 3 + Math.floor(Math.random() * 3);
      row[`Q${q} Score`] = score;
      total += score;
    }
    row['Total'] = total;
    row['Percentage'] = Number(((total / 75) * 100).toFixed(2));
    return row;
  });
};

// 5. Generate Project Review Dummy Data
export const generateProjectReviewData = () => {
  const projectInterns = internMasterData.filter(d => d['Project Required'] === 'Yes');
  return projectInterns.map(intern => {
    const hrScore = 75 + Math.floor(Math.random() * 20);
    const peerAverage = 80 + Math.floor(Math.random() * 15);
    const penalty = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0;

    return {
      'P No': intern['P No'],
      'HR Score': hrScore,
      'Peer Average': Math.round(peerAverage * 100) / 100,
      'Penalty': Math.round(penalty * 100) / 100,
    };
  });
};

// Main download triggering helper
export const downloadTemplateFile = (moduleName: string) => {
  let data: any[] = [];
  let filename = '';

  switch (moduleName) {
    case 'intern_master':
      data = internMasterData;
      filename = 'intern_master_template.xlsx';
      break;
    case 'smart_card':
      data = generateSmartCardData();
      filename = 'smart_card_attendance_template.xlsx';
      break;
    case 'daily_attendance':
      data = generateDailyAttendanceData();
      filename = 'daily_attendance_template.xlsx';
      break;
    case 'guide_feedback':
      data = generateGuideFeedbackData();
      filename = 'guide_feedback_template.xlsx';
      break;
    case 'project_review':
      data = generateProjectReviewData();
      filename = 'project_review_template.xlsx';
      break;
    default:
      return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const output = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
