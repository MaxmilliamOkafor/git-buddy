// pdf-ats-turbo.js - 100% ATS-Parseable PDF Generator (≤800ms)
// Exact formatting per recruiter requirements

(function() {
  'use strict';

  const PDFATSTurbo = {
    // ============ PDF CONFIGURATION (ATS-PERFECT) ============
    CONFIG: {
      // Font: Arial or Calibri, 10-11pt
      font: 'helvetica', // jsPDF uses helvetica as Arial equivalent
      fontSize: {
        name: 14,
        sectionTitle: 11,
        body: 10,
        small: 9
      },
      // Margins: 0.75 inches all sides (54pt)
      margins: {
        top: 54,      // 0.75" = 54pt
        bottom: 54,
        left: 54,
        right: 54
      },
      // Line spacing: 1.15
      lineHeight: 1.15,
      // A4 dimensions in points
      pageWidth: 595.28,
      pageHeight: 841.89
    },

    // ============ SECTION HEADERS (All caps, bold) ============
    SECTION_ORDER: [
      'CONTACT INFORMATION',
      'PROFESSIONAL SUMMARY',
      'EXPERIENCE',
      'SKILLS',
      'EDUCATION',
      'CERTIFICATIONS'
    ],

    // ============ GENERATE ATS-PERFECT CV PDF (≤800ms) ============
    async generateATSPerfectCV(candidateData, tailoredCV, jobData, keywords = []) {
      const startTime = performance.now();
      console.log('[PDFATSTurbo] Generating ATS-perfect CV...');

      // Parse and format CV content
      const formattedContent = this.formatCVForATS(tailoredCV, candidateData, keywords);
      
      // Build PDF text (UTF-8 text-only binary)
      const pdfText = this.buildPDFText(formattedContent, candidateData, jobData);
      
      // Generate filename: {FirstName}_{LastName}_CV.pdf
      const firstName = (candidateData?.firstName || candidateData?.first_name || 'Applicant').replace(/\s+/g, '_');
      const lastName = (candidateData?.lastName || candidateData?.last_name || '').replace(/\s+/g, '_');
      const fileName = lastName ? `${firstName}_${lastName}_CV.pdf` : `${firstName}_CV.pdf`;

      // Generate actual PDF if jsPDF available
      let pdfBase64 = null;
      let pdfBlob = null;

      if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
        const pdfResult = await this.generateWithJsPDF(formattedContent, candidateData, jobData);
        pdfBase64 = pdfResult.base64;
        pdfBlob = pdfResult.blob;
      } else {
        // Fallback: Generate text for backend
        pdfBase64 = btoa(unescape(encodeURIComponent(pdfText)));
      }

      const timing = performance.now() - startTime;
      console.log(`[PDFATSTurbo] CV PDF generated in ${timing.toFixed(0)}ms (target: 800ms)`);

      return {
        pdf: pdfBase64,
        blob: pdfBlob,
        fileName,
        text: pdfText,
        formattedContent,
        timing,
        size: pdfBase64 ? Math.round(pdfBase64.length * 0.75 / 1024) : 0 // Approximate KB
      };
    },

    // ============ FORMAT CV FOR ATS (EXACT REQUIREMENTS) ============
    formatCVForATS(cvText, candidateData, keywords = []) {
      const sections = {};
      
      // CONTACT INFORMATION (centered)
      sections.contact = this.buildContactSection(candidateData);
      
      // Parse existing CV sections
      const parsed = this.parseCVSections(cvText);
      
      // PROFESSIONAL SUMMARY
      sections.summary = parsed.summary || '';
      
      // EXPERIENCE - Inject keywords naturally into bullets
      sections.experience = this.formatExperienceWithKeywords(parsed.experience, keywords);
      
      // SKILLS - Comma-separated plain text (critical for keyword matching)
      sections.skills = this.formatSkillsSection(parsed.skills, keywords);
      
      // EDUCATION
      sections.education = parsed.education || '';
      
      // CERTIFICATIONS
      sections.certifications = parsed.certifications || '';

      return sections;
    },

    // ============ BUILD CONTACT SECTION ============
    buildContactSection(candidateData) {
      const firstName = candidateData?.firstName || candidateData?.first_name || '';
      const lastName = candidateData?.lastName || candidateData?.last_name || '';
      const name = `${firstName} ${lastName}`.trim();
      const phone = candidateData?.phone || '';
      const email = candidateData?.email || '';
      const linkedin = candidateData?.linkedin || '';
      const github = candidateData?.github || '';
      const portfolio = candidateData?.portfolio || '';
      const location = candidateData?.city || candidateData?.location || 'Open to relocation';

      return {
        name,
        contactLine: [phone, email, location, 'open to relocation'].filter(Boolean).join(' | '),
        linksLine: [linkedin, github, portfolio].filter(Boolean).join(' | ')
      };
    },

    // ============ PARSE CV SECTIONS ============
    parseCVSections(cvText) {
      if (!cvText) return {};
      
      const sections = {
        summary: '',
        experience: '',
        skills: '',
        education: '',
        certifications: ''
      };

      const patterns = {
        summary: /(?:PROFESSIONAL\s*SUMMARY|SUMMARY|PROFILE|OBJECTIVE)[\s:]*\n([\s\S]*?)(?=\n(?:EXPERIENCE|WORK|SKILLS|EDUCATION|CERTIFICATIONS|$))/i,
        experience: /(?:EXPERIENCE|WORK\s*EXPERIENCE|EMPLOYMENT)[\s:]*\n([\s\S]*?)(?=\n(?:SKILLS|EDUCATION|CERTIFICATIONS|$))/i,
        skills: /(?:SKILLS|TECHNICAL\s*SKILLS|CORE\s*SKILLS)[\s:]*\n([\s\S]*?)(?=\n(?:EDUCATION|CERTIFICATIONS|$))/i,
        education: /(?:EDUCATION|ACADEMIC)[\s:]*\n([\s\S]*?)(?=\n(?:CERTIFICATIONS|$))/i,
        certifications: /(?:CERTIFICATIONS?|LICENSES?)[\s:]*\n([\s\S]*?)$/i
      };

      for (const [section, pattern] of Object.entries(patterns)) {
        const match = cvText.match(pattern);
        if (match) {
          sections[section] = match[1].trim();
        }
      }

      return sections;
    },

    // ============ FORMAT EXPERIENCE WITH KEYWORD INJECTION ============
    formatExperienceWithKeywords(experienceText, keywords = []) {
      if (!experienceText) return '';
      
      const lines = experienceText.split('\n');
      const keywordsLower = keywords.map(k => k.toLowerCase());
      const usedKeywords = new Set();
      let keywordIndex = 0;
      const maxKeywordsPerBullet = 2;
      
      const formattedLines = lines.map(line => {
        const trimmed = line.trim();
        
        // Check if it's a bullet point
        if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
          let bulletContent = trimmed.replace(/^[-•*]\s*/, '');
          const bulletLower = bulletContent.toLowerCase();
          
          // Count how many keywords already in this bullet
          let existingCount = 0;
          keywordsLower.forEach(kw => {
            if (bulletLower.includes(kw)) existingCount++;
          });
          
          // Inject up to 2 keywords per bullet if missing
          if (existingCount < maxKeywordsPerBullet && keywordIndex < keywords.length) {
            const toAdd = [];
            while (toAdd.length < (maxKeywordsPerBullet - existingCount) && keywordIndex < keywords.length) {
              const kw = keywords[keywordIndex];
              if (!bulletLower.includes(kw.toLowerCase()) && !usedKeywords.has(kw.toLowerCase())) {
                toAdd.push(kw);
                usedKeywords.add(kw.toLowerCase());
              }
              keywordIndex++;
            }
            
            if (toAdd.length > 0) {
              // Naturally weave keywords into the bullet (not listed separately)
              if (bulletContent.endsWith('.')) {
                bulletContent = bulletContent.slice(0, -1) + `, leveraging ${toAdd.join(' and ')}.`;
              } else {
                bulletContent = bulletContent + ` utilizing ${toAdd.join(' and ')}`;
              }
            }
          }
          
          return `-  ${bulletContent}`;
        }
        
        return line;
      });
      
      return formattedLines.join('\n');
    },

    // ============ FORMAT SKILLS SECTION (COMMA-SEPARATED) ============
    formatSkillsSection(skillsText, keywords = []) {
      // Collect all skills from existing text
      const existingSkills = new Set();
      
      if (skillsText) {
        // Extract words from skills section
        const skillWords = skillsText
          .replace(/[•\-*]/g, ',')
          .split(/[, \n]/)
          .map(s => s.trim())
          .filter(s => s.length >= 2 && s.length <= 50);
        skillWords.forEach(s => existingSkills.add(s));
      }
      
      // Add missing keywords (proper nouns keep capitalization)
      const properNouns = new Set([
        'Python', 'SQL', 'TensorFlow', 'Spark', 'XGBoost', 'LightGBM', 'AWS', 'Azure',
        'Google Cloud Platform', 'Kubernetes', 'Docker', 'Terraform', 'Apache Spark',
        'Airflow', 'Kafka', 'Snowflake', 'Jenkins', 'GitHub Actions', 'Agile', 'Scrum'
      ]);
      
      keywords.forEach(kw => {
        const kwLower = kw.toLowerCase();
        const hasIt = [...existingSkills].some(s => s.toLowerCase() === kwLower);
        if (!hasIt) {
          // Check if it's a proper noun
          const proper = [...properNouns].find(p => p.toLowerCase() === kwLower);
          existingSkills.add(proper || kw.toLowerCase());
        }
      });
      
      // Return comma-separated list (no bullets for first line per requirements)
      return [...existingSkills].join(', ');
    },

    // ============ BUILD PDF TEXT (UTF-8) ============
    buildPDFText(sections, candidateData, jobData) {
      const lines = [];
      
      // CONTACT INFORMATION (centered)
      lines.push(sections.contact.name.toUpperCase());
      lines.push(sections.contact.contactLine);
      lines.push(sections.contact.linksLine);
      lines.push('');
      
      // PROFESSIONAL SUMMARY
      if (sections.summary) {
        lines.push('PROFESSIONAL SUMMARY');
        lines.push(sections.summary);
        lines.push('');
      }
      
      // EXPERIENCE
      if (sections.experience) {
        lines.push('EXPERIENCE');
        lines.push(sections.experience);
        lines.push('');
      }
      
      // SKILLS (comma-separated)
      if (sections.skills) {
        lines.push('SKILLS');
        lines.push(sections.skills);
        lines.push('');
      }
      
      // EDUCATION
      if (sections.education) {
        lines.push('EDUCATION');
        lines.push(sections.education);
        lines.push('');
      }
      
      // CERTIFICATIONS
      if (sections.certifications) {
        lines.push('CERTIFICATIONS');
        lines.push(sections.certifications);
      }
      
      return lines.join('\n');
    },

    // ============ GENERATE WITH jsPDF (≤800ms) ============
    async generateWithJsPDF(sections, candidateData, jobData) {
      const { jsPDF } = jspdf;
      const { font, fontSize, margins, lineHeight, pageWidth, pageHeight } = this.CONFIG;
      const contentWidth = pageWidth - margins.left - margins.right;
      
      const doc = new jsPDF({
        format: 'a4',
        unit: 'pt',
        putOnlyUsedFonts: true
      });

      doc.setFont(font, 'normal');
      let yPos = margins.top;

      // Helper: Add text with word wrap
      const addText = (text, isBold = false, isCentered = false, size = fontSize.body) => {
        doc.setFontSize(size);
        doc.setFont(font, isBold ? 'bold' : 'normal');
        
        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach(line => {
          if (yPos > pageHeight - margins.bottom - 20) {
            doc.addPage();
            yPos = margins.top;
          }
          
          const xPos = isCentered ? (pageWidth - doc.getTextWidth(line)) / 2 : margins.left;
          doc.text(line, xPos, yPos);
          yPos += size * lineHeight;
        });
      };

      // Helper: Add section header (ALL CAPS, BOLD)
      const addSectionHeader = (title) => {
        yPos += 8; // Section spacing
        doc.setFontSize(fontSize.sectionTitle);
        doc.setFont(font, 'bold');
        doc.text(title.toUpperCase(), margins.left, yPos);
        yPos += fontSize.sectionTitle + 2;
        
        // Underline
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(margins.left, yPos - 3, pageWidth - margins.right, yPos - 3);
        yPos += 6;
      };

      // NAME (centered, larger)
      addText(sections.contact.name.toUpperCase(), true, true, fontSize.name);
      yPos += 4;

      // Contact line (centered)
      addText(sections.contact.contactLine, false, true, fontSize.body);
      
      // Links line (centered)
      if (sections.contact.linksLine) {
        addText(sections.contact.linksLine, false, true, fontSize.small);
      }
      yPos += 10;

      // PROFESSIONAL SUMMARY
      if (sections.summary) {
        addSectionHeader('PROFESSIONAL SUMMARY');
        addText(sections.summary, false, false, fontSize.body);
      }

      // EXPERIENCE
      if (sections.experience) {
        addSectionHeader('EXPERIENCE');
        const expLines = sections.experience.split('\n');
        expLines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
            // Bullet point
            addText(trimmed, false, false, fontSize.body);
          } else if (trimmed.includes('|') || /^\d{4}/.test(trimmed) || /[A-Z]{2,}/.test(trimmed.substring(0, 30))) {
            // Job title/company line
            addText(trimmed, true, false, fontSize.body);
          } else if (trimmed) {
            addText(trimmed, false, false, fontSize.body);
          }
        });
      }

      // SKILLS (comma-separated, plain text)
      if (sections.skills) {
        addSectionHeader('SKILLS');
        addText(sections.skills, false, false, fontSize.body);
      }

      // EDUCATION
      if (sections.education) {
        addSectionHeader('EDUCATION');
        addText(sections.education, false, false, fontSize.body);
      }

      // CERTIFICATIONS
      if (sections.certifications) {
        addSectionHeader('CERTIFICATIONS');
        addText(sections.certifications, false, false, fontSize.body);
      }

      // Generate output
      const base64 = doc.output('datauristring').split(',')[1];
      const blob = doc.output('blob');

      return { base64, blob };
    },

    // ============ GENERATE COVER LETTER PDF ============
    async generateCoverLetterPDF(candidateData, coverLetterText, jobData) {
      const startTime = performance.now();
      
      // CRITICAL: Replace "Dear Hiring Committee," with "Dear Hiring Manager,"
      let formattedCoverLetter = coverLetterText || '';
      formattedCoverLetter = formattedCoverLetter.replace(/Dear\s+Hiring\s+Committee,?/gi, 'Dear Hiring Manager,');
      formattedCoverLetter = formattedCoverLetter.replace(/Dear\s+Sir\/Madam,?/gi, 'Dear Hiring Manager,');
      formattedCoverLetter = formattedCoverLetter.replace(/To\s+Whom\s+It\s+May\s+Concern,?/gi, 'Dear Hiring Manager,');
      
      const firstName = (candidateData?.firstName || candidateData?.first_name || 'Applicant').replace(/\s+/g, '_');
      const lastName = (candidateData?.lastName || candidateData?.last_name || '').replace(/\s+/g, '_');
      const fileName = lastName ? `${firstName}_${lastName}_Cover_Letter.pdf` : `${firstName}_Cover_Letter.pdf`;

      let pdfBase64 = null;
      let pdfBlob = null;

      if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
        const { jsPDF } = jspdf;
        const { font, fontSize, margins, lineHeight, pageWidth, pageHeight } = this.CONFIG;
        const contentWidth = pageWidth - margins.left - margins.right;
        
        const doc = new jsPDF({ format: 'a4', unit: 'pt' });
        doc.setFont(font, 'normal');
        doc.setFontSize(fontSize.body);
        
        let yPos = margins.top;
        
        // Add date
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.text(today, margins.left, yPos);
        yPos += 30;
        
        // Add cover letter content with word wrap
        const paragraphs = formattedCoverLetter.split('\n\n');
        paragraphs.forEach(para => {
          const lines = doc.splitTextToSize(para.trim(), contentWidth);
          lines.forEach(line => {
            if (yPos > pageHeight - margins.bottom - 20) {
              doc.addPage();
              yPos = margins.top;
            }
            doc.text(line, margins.left, yPos);
            yPos += fontSize.body * lineHeight;
          });
          yPos += 10; // Paragraph spacing
        });

        pdfBase64 = doc.output('datauristring').split(',')[1];
        pdfBlob = doc.output('blob');
      } else {
        pdfBase64 = btoa(unescape(encodeURIComponent(formattedCoverLetter)));
      }

      const timing = performance.now() - startTime;
      console.log(`[PDFATSTurbo] Cover Letter PDF generated in ${timing.toFixed(0)}ms`);

      return {
        pdf: pdfBase64,
        blob: pdfBlob,
        fileName,
        text: formattedCoverLetter,
        timing,
        size: pdfBase64 ? Math.round(pdfBase64.length * 0.75 / 1024) : 0
      };
    }
  };

  // Export to global scope
  window.PDFATSTurbo = PDFATSTurbo;
})();
