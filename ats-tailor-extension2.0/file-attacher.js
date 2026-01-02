// file-attacher.js - Ultra-fast File Attachment (≤200ms)
// CRITICAL: Fixes the bug where tailored PDFs are not being attached to form fields

(function() {
  'use strict';

  const FileAttacher = {
    // ============ TIMING TARGET ============
    TIMING_TARGET: 200, // 200ms max for file attachment

    // ============ FIELD DETECTION PATTERNS ============
    CV_PATTERNS: [
      /resume/i, /cv/i, /curriculum/i
    ],
    
    COVER_PATTERNS: [
      /cover/i, /letter/i
    ],

    // ============ ATTACH FILES TO FORM (≤200ms) ============
    async attachFilesToForm(cvFile, coverFile, options = {}) {
      const startTime = performance.now();
      console.log('[FileAttacher] Starting file attachment...');
      
      const results = {
        cvAttached: false,
        coverAttached: false,
        errors: []
      };

      // STEP 1: Remove any LazyApply pre-attached files (instant)
      this.removeLazyApplyFiles();

      // STEP 2: Reveal hidden file inputs
      this.revealHiddenInputs();

      // STEP 3: Find and attach CV
      if (cvFile) {
        try {
          results.cvAttached = await this.attachToFirstMatch(cvFile, 'cv');
          if (results.cvAttached) {
            console.log('[FileAttacher] ✅ CV attached:', cvFile.name, `(${cvFile.size} bytes)`);
          } else {
            results.errors.push('CV field not found');
          }
        } catch (e) {
          results.errors.push(`CV attach error: ${e.message}`);
        }
      }

      // STEP 4: Find and attach Cover Letter
      if (coverFile) {
        try {
          results.coverAttached = await this.attachToCoverField(coverFile);
          if (results.coverAttached) {
            console.log('[FileAttacher] ✅ Cover Letter attached:', coverFile.name, `(${coverFile.size} bytes)`);
          } else {
            results.errors.push('Cover Letter field not found');
          }
        } catch (e) {
          results.errors.push(`Cover attach error: ${e.message}`);
        }
      }

      const timing = performance.now() - startTime;
      console.log(`[FileAttacher] Attachment complete in ${timing.toFixed(0)}ms (target: ${this.TIMING_TARGET}ms)`);
      
      return { ...results, timing };
    },

    // ============ REMOVE LAZYAPPLY FILES ============
    removeLazyApplyFiles() {
      document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.files && input.files.length > 0) {
          const fileName = input.files[0]?.name?.toLowerCase() || '';
          if (fileName.includes('lazyapply') || fileName.includes('lazy_apply') || fileName.includes('lazy-apply')) {
            console.log('[FileAttacher] Removing LazyApply file:', fileName);
            const dt = new DataTransfer();
            input.files = dt.files;
            this.fireEvents(input);
          }
        }
      });
    },

    // ============ REVEAL HIDDEN FILE INPUTS ============
    revealHiddenInputs() {
      // Click attach/upload buttons that reveal hidden inputs
      const uploadButtons = document.querySelectorAll([
        '[data-qa-upload]',
        '[data-qa="upload"]',
        '[data-qa="attach"]',
        'button[class*="upload" i]',
        'button[class*="attach" i]',
        '[role="button"][class*="upload" i]'
      ].join(', '));

      uploadButtons.forEach(btn => {
        const parent = btn.closest('.field') || btn.closest('[class*="upload"]') || btn.parentElement;
        const existingInput = parent?.querySelector('input[type="file"]');
        if (!existingInput || existingInput.offsetParent === null) {
          try { btn.click(); } catch {}
        }
      });

      // Make hidden file inputs visible
      document.querySelectorAll('input[type="file"]').forEach(input => {
        if (input.offsetParent === null) {
          input.style.cssText = 'display:block !important; visibility:visible !important; opacity:1 !important; position:relative !important; height:auto !important; width:auto !important;';
        }
      });
    },

    // ============ ATTACH TO CV FIELD ============
    async attachToFirstMatch(file, type = 'cv') {
      const patterns = type === 'cv' ? this.CV_PATTERNS : this.COVER_PATTERNS;
      const antiPatterns = type === 'cv' ? this.COVER_PATTERNS : this.CV_PATTERNS;
      
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      for (const input of fileInputs) {
        if (this.matchesFieldType(input, patterns, antiPatterns)) {
          return this.attachFile(input, file);
        }
      }
      
      // Fallback: If no specific CV field, attach to first available file input
      if (type === 'cv' && fileInputs.length > 0) {
        const firstUnused = [...fileInputs].find(i => !i.files?.length);
        if (firstUnused) {
          return this.attachFile(firstUnused, file);
        }
      }
      
      return false;
    },

    // ============ ATTACH TO COVER LETTER FIELD ============
    async attachToCoverField(file) {
      // Try file input first
      const fileInputs = document.querySelectorAll('input[type="file"]');
      
      for (const input of fileInputs) {
        if (this.matchesFieldType(input, this.COVER_PATTERNS, this.CV_PATTERNS)) {
          return this.attachFile(input, file);
        }
      }
      
      // Fallback: If multiple file inputs, use second one for cover letter
      if (fileInputs.length >= 2) {
        const cvInput = [...fileInputs].find(i => this.matchesFieldType(i, this.CV_PATTERNS, []));
        const coverInput = [...fileInputs].find(i => i !== cvInput && (!i.files?.length || i.files.length === 0));
        if (coverInput) {
          return this.attachFile(coverInput, file);
        }
      }
      
      return false;
    },

    // ============ MATCH FIELD TYPE ============
    matchesFieldType(input, patterns, antiPatterns) {
      const text = this.getFieldContext(input);
      
      // Check anti-patterns first
      for (const anti of antiPatterns) {
        if (anti.test(text)) return false;
      }
      
      // Check patterns
      for (const pattern of patterns) {
        if (pattern.test(text)) return true;
      }
      
      return false;
    },

    // ============ GET FIELD CONTEXT ============
    getFieldContext(input) {
      const parts = [];
      
      // Labels
      if (input.labels?.[0]) {
        parts.push(input.labels[0].textContent);
      }
      
      // Attributes
      parts.push(input.name || '');
      parts.push(input.id || '');
      parts.push(input.getAttribute('aria-label') || '');
      parts.push(input.getAttribute('placeholder') || '');
      parts.push(input.getAttribute('data-automation-id') || '');
      
      // Parent context (up to 5 levels)
      let parent = input.parentElement;
      for (let i = 0; i < 5 && parent; i++) {
        const parentText = parent.textContent?.substring(0, 200) || '';
        if (parentText.length < 500) { // Avoid huge text blocks
          parts.push(parentText);
        }
        parent = parent.parentElement;
      }
      
      return parts.join(' ').toLowerCase();
    },

    // ============ ATTACH FILE TO INPUT ============
    attachFile(input, file) {
      try {
        // Clear existing files first
        if (input.files && input.files.length > 0) {
          const existingName = input.files[0]?.name || '';
          // Don't replace if it's already our file
          if (existingName === file.name) {
            console.log('[FileAttacher] File already attached:', file.name);
            return true;
          }
        }
        
        // Create DataTransfer and set files
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        
        // Fire all relevant events
        this.fireEvents(input);
        
        // Verify attachment
        if (input.files && input.files.length > 0 && input.files[0].name === file.name) {
          console.log('[FileAttacher] File attached successfully:', file.name, `(${input.files[0].size} bytes)`);
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('[FileAttacher] Attach error:', e);
        return false;
      }
    },

    // ============ FIRE INPUT EVENTS ============
    fireEvents(input) {
      ['input', 'change', 'blur'].forEach(type => {
        input.dispatchEvent(new Event(type, { bubbles: true }));
      });
      
      // React-specific events
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        try {
          const event = new Event('input', { bubbles: true });
          input.dispatchEvent(event);
        } catch {}
      }
    },

    // ============ CREATE PDF FILE FROM BASE64 ============
    createPDFFile(base64, fileName) {
      try {
        if (!base64) return null;
        
        let data = base64;
        if (base64.includes(',')) {
          data = base64.split(',')[1];
        }
        
        const byteString = atob(data);
        const buffer = new ArrayBuffer(byteString.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < byteString.length; i++) {
          view[i] = byteString.charCodeAt(i);
        }
        
        const file = new File([buffer], fileName, { type: 'application/pdf' });
        console.log(`[FileAttacher] Created PDF file: ${fileName} (${file.size} bytes)`);
        return file;
      } catch (e) {
        console.error('[FileAttacher] PDF creation failed:', e);
        return null;
      }
    },

    // ============ FILL COVER LETTER TEXTAREA ============
    async fillCoverLetterTextarea(coverLetterText) {
      if (!coverLetterText) return false;
      
      // Replace generic salutations with "Dear Hiring Manager,"
      let formattedText = coverLetterText;
      formattedText = formattedText.replace(/Dear\s+Hiring\s+Committee,?/gi, 'Dear Hiring Manager,');
      formattedText = formattedText.replace(/Dear\s+Sir\/Madam,?/gi, 'Dear Hiring Manager,');
      formattedText = formattedText.replace(/To\s+Whom\s+It\s+May\s+Concern,?/gi, 'Dear Hiring Manager,');
      
      const textareas = document.querySelectorAll('textarea');
      
      for (const textarea of textareas) {
        const label = (textarea.labels?.[0]?.textContent || textarea.name || textarea.id || '').toLowerCase();
        const parent = textarea.closest('.field')?.textContent?.toLowerCase() || '';
        
        if (/cover/i.test(label) || /cover/i.test(parent)) {
          textarea.value = formattedText;
          this.fireEvents(textarea);
          console.log('[FileAttacher] ✅ Cover Letter textarea filled');
          return true;
        }
      }
      
      return false;
    },

    // ============ MONITOR AND RE-ATTACH (for dynamic forms) ============
    startAttachmentMonitor(cvFile, coverFile, maxDuration = 10000) {
      const startTime = Date.now();
      let attached = { cv: false, cover: false };
      
      const checkAndAttach = () => {
        if (Date.now() - startTime > maxDuration) {
          console.log('[FileAttacher] Monitor timeout reached');
          return;
        }
        
        // Check if files are still attached
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        if (cvFile && !attached.cv) {
          for (const input of fileInputs) {
            if (this.matchesFieldType(input, this.CV_PATTERNS, this.COVER_PATTERNS)) {
              if (!input.files?.length || input.files[0].name !== cvFile.name) {
                this.attachFile(input, cvFile);
              }
              attached.cv = true;
              break;
            }
          }
        }
        
        if (coverFile && !attached.cover) {
          for (const input of fileInputs) {
            if (this.matchesFieldType(input, this.COVER_PATTERNS, this.CV_PATTERNS)) {
              if (!input.files?.length || input.files[0].name !== coverFile.name) {
                this.attachFile(input, coverFile);
              }
              attached.cover = true;
              break;
            }
          }
        }
        
        // Continue monitoring if not all attached
        if (!attached.cv || !attached.cover) {
          requestAnimationFrame(checkAndAttach);
        }
      };
      
      // Start monitoring
      checkAndAttach();
      
      // Also set up mutation observer for dynamically added inputs
      const observer = new MutationObserver(() => {
        if (!attached.cv || !attached.cover) {
          checkAndAttach();
        } else {
          observer.disconnect();
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Stop after max duration
      setTimeout(() => observer.disconnect(), maxDuration);
    }
  };

  // Export to global scope
  window.FileAttacher = FileAttacher;
})();
