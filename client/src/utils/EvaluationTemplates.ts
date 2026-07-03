import * as XLSX from 'xlsx';

// 1. Intern Master Dummy Data
export const internMasterData = [
  {
    'P No': '106245',
    'Candidate Name': 'Rahul Sharma',
    'Phone': '9876543210',
    'Qualification': 'B.Tech',
    'Intern Type': 'B.Tech',
    'College': 'ABC College',
    'Branch': 'Computer Science',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '82.5',
    'Skills': 'React, Node, SQL',
    'Project Required': 'Yes',
    'Project Title': 'Portal Revamp',
    'Project Domain': 'Web Development',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106246',
    'Candidate Name': 'Sneha Patil',
    'Phone': '9876543211',
    'Qualification': 'M.Tech',
    'Intern Type': 'M.Tech',
    'College': 'XYZ College',
    'Branch': 'Mechanical',
    'Department': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '78.9',
    'Skills': 'Process Design, CAD',
    'Project Required': 'No',
    'Project Title': '',
    'Project Domain': 'Operations',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106247',
    'Candidate Name': 'Amit Kumar',
    'Phone': '9876543212',
    'Qualification': 'B.E.',
    'Intern Type': 'B.E.',
    'College': 'MIT Pune',
    'Branch': 'Information Technology',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '85.2',
    'Skills': 'Python, PyTorch',
    'Project Required': 'Yes',
    'Project Title': 'LLM Fine-tuning',
    'Project Domain': 'AI Research',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106248',
    'Candidate Name': 'Priya Desai',
    'Phone': '9876543213',
    'Qualification': 'MBA',
    'Intern Type': 'MBA',
    'College': 'COEP',
    'Branch': 'Human Resources',
    'Department': 'Support',
    'Graduation Year': 2026,
    'Bachelor Percentage': '91.0',
    'Skills': 'Talent Acquisition',
    'Project Required': 'No',
    'Project Title': '',
    'Project Domain': 'HR Ops',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106249',
    'Candidate Name': 'Rohit Pawar',
    'Phone': '9876543214',
    'Qualification': 'B.Tech',
    'Intern Type': 'B.Tech',
    'College': 'PCCOE',
    'Branch': 'Computer Science',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '75.4',
    'Skills': 'Angular, Java',
    'Project Required': 'Yes',
    'Project Title': 'UI Dashboard',
    'Project Domain': 'Full Stack',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106250',
    'Candidate Name': 'Neha Joshi',
    'Phone': '9876543215',
    'Qualification': 'B.E.',
    'Intern Type': 'B.E.',
    'College': 'DY Patil',
    'Branch': 'Electrical',
    'Department': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '88.1',
    'Skills': 'Power Systems',
    'Project Required': 'No',
    'Project Title': '',
    'Project Domain': 'Operations',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106251',
    'Candidate Name': 'Akash More',
    'Phone': '9876543216',
    'Qualification': 'B.Tech',
    'Intern Type': 'B.Tech',
    'College': 'JSPM',
    'Branch': 'Information Technology',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '80.0',
    'Skills': 'Python, Flask',
    'Project Required': 'Yes',
    'Project Title': 'API Gateway',
    'Project Domain': 'Backend Development',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106252',
    'Candidate Name': 'Pooja Kulkarni',
    'Phone': '9876543217',
    'Qualification': 'B.E.',
    'Intern Type': 'B.E.',
    'College': 'MIT WPU',
    'Branch': 'Computer Science',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '83.2',
    'Skills': 'React, CSS',
    'Project Required': 'Yes',
    'Project Title': 'Analytics View',
    'Project Domain': 'Frontend',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106253',
    'Candidate Name': 'Sagar Patil',
    'Phone': '9876543218',
    'Qualification': 'B.E.',
    'Intern Type': 'B.E.',
    'College': 'COEP',
    'Branch': 'Mechanical',
    'Department': 'Operations',
    'Graduation Year': 2026,
    'Bachelor Percentage': '72.0',
    'Skills': 'AutoCAD, SolidWorks',
    'Project Required': 'No',
    'Project Title': '',
    'Project Domain': 'Operations',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Shashikant Rode',
    'Status': 'Ongoing',
    'Remarks': '',
  },
  {
    'P No': '106254',
    'Candidate Name': 'Anjali Jadhav',
    'Phone': '9876543219',
    'Qualification': 'B.Tech',
    'Intern Type': 'B.Tech',
    'College': 'VIIT',
    'Branch': 'Computer Engineering',
    'Department': 'Development',
    'Graduation Year': 2026,
    'Bachelor Percentage': '89.5',
    'Skills': 'Python, Django',
    'Project Required': 'Yes',
    'Project Title': 'Intern System',
    'Project Domain': 'Web Development',
    'Date of Joining': '2026-06-01',
    'Duration (Months)': 3,
    'Date of Leaving': '2026-09-01',
    'Guide Name': 'Santosh Ghanwat',
    'Status': 'Ongoing',
    'Remarks': '',
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
  for (const intern of internMasterData) {
    for (const date of dates) {
      const inHour = 8 + (Math.random() > 0.85 ? 1 : 0);
      const inMinute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const outHour = 17 + (Math.random() > 0.85 ? 1 : 0);
      const outMinute = String(Math.floor(Math.random() * 60)).padStart(2, '0');
      const hours = (outHour - inHour) + (parseInt(outMinute) - parseInt(inMinute)) / 60;

      rows.push({
        'P No': intern['P No'],
        'Candidate Name': intern['Candidate Name'],
        'Date': date,
        'In Time': `${String(inHour).padStart(2, '0')}:${inMinute}`,
        'Out Time': `${String(outHour).padStart(2, '0')}:${outMinute}`,
        'Working Hours': `${hours.toFixed(2)} hrs`,
        'Status': inHour * 60 + parseInt(inMinute) > 9 * 60 + 15 ? 'Late' : 'On Time',
        'Remarks': '',
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
        'Candidate Name': intern['Candidate Name'],
        'Date': date,
        'Attendance Status': 'Present',
        'Report Submitted': 'Yes',
        'Submission Time': submissionTime,
        'Department': intern['Department'],
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
      'P No': intern['P No'],
      'Candidate Name': intern['Candidate Name'],
      'Guide Name': intern['Guide Name'],
      'Department': intern['Department'],
    };
    let total = 0;
    for (let q = 5; q <= 19; q++) {
      const score = 3 + Math.floor(Math.random() * 3);
      row[`Q${q}`] = score;
      total += score;
    }
    // obtained marks excluding Q10
    const obtainedExclQ10 = Object.keys(row)
      .filter(k => k.startsWith('Q') && k !== 'Q10')
      .reduce((sum, k) => sum + row[k], 0);
    
    row['Guide Score'] = Number(((obtainedExclQ10 / 70) * 100).toFixed(2));
    row['Remarks'] = 'Good Performer';
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
    const presentationScore = 80 + Math.floor(Math.random() * 15);
    const finalScore = (hrScore + peerAverage + presentationScore) / 3 - penalty;

    return {
      'P No': intern['P No'],
      'Candidate Name': intern['Candidate Name'],
      'Guide Name': intern['Guide Name'],
      'Department': intern['Department'],
      'HR Score': hrScore,
      'Peer Average': Math.round(peerAverage * 100) / 100,
      'Presentation Score': presentationScore,
      'Penalty': Math.round(penalty * 100) / 100,
      'Final Project Score': Math.round(finalScore * 100) / 100,
      'Remarks': '',
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
