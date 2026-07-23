import re

file_path = "frontend/src/App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State changes
content = content.replace(
    'const [activePortal, setActivePortal] =\n    useState("borrower");',
    'const [activePortal, setActivePortal] = useState("borrower");\n  const [selectedBorrower, setSelectedBorrower] = useState(null);'
)

# 2. Auth user update
content = content.replace(
    '// Auto-select portal based on role\n    if (user.role === "lender") setActivePortal("lender");\n    else setActivePortal("borrower");',
    '// Auto-select portal based on role\n    if (user.role === "lender") setActivePortal("lender");\n    else setActivePortal("borrower");'
)

# 3. Top bar toggles removal
toggles_str = """        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActivePortal("borrower")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition duration-150 ${activePortal === "borrower"
              ? "bg-[#044335] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Borrower Portal
          </button>
          <button
            onClick={() => setActivePortal("lender")}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition duration-150 ${activePortal === "lender"
              ? "bg-[#044335] text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Lender Portal
          </button>
        </div>"""
content = content.replace(toggles_str, "")

# 4. Extract Right Dashboard Panel
right_panel_start = content.find('{/* RIGHT DASHBOARD PANEL */}')
right_panel_end = content.find('</div>\n          </div>\n        ) : (')
if right_panel_start != -1 and right_panel_end != -1:
    right_panel_content = content[right_panel_start:right_panel_end]
    
    # Remove Right Dashboard from Borrower
    content = content[:right_panel_start] + content[right_panel_end:]
    
    # Change Borrower left panel width to full
    content = content.replace(
        '<div className="w-[62%] h-full overflow-y-auto pr-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">',
        '<div className="w-full max-w-4xl mx-auto h-full overflow-y-auto pr-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">'
    )
    
    # Insert Right Dashboard into Lender
    lender_portal_start = content.find('/* LENDER PORTAL - FULL WIDTH */\n          <div className="h-full overflow-y-auto p-8 max-w-7xl mx-auto w-full">')
    
    # We want to change the Lender Portal layout to match the Borrower's old two-column layout
    new_lender_wrapper = """/* LENDER PORTAL */
          <div className="h-full flex max-w-[1400px] mx-auto w-full p-6 gap-6 overflow-hidden">
            {/* LEFT SECTION */}
            <div className="w-[62%] h-full overflow-y-auto pr-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">"""
    
    content = content.replace(
        '/* LENDER PORTAL - FULL WIDTH */\n          <div className="h-full overflow-y-auto p-8 max-w-7xl mx-auto w-full">',
        new_lender_wrapper
    )
    
    # At the end of the lender portal, we need to close the left section and insert the right section
    # Let's find the end of the Lender Portal. It's right before `{/* FOOTER */}`
    footer_idx = content.find('{/* FOOTER */}')
    # find the `</div>\n          </div>\n        )}` before footer
    end_lender_str = '</div>\n            </div>\n          </div>\n        )}'
    
    # Wait, the exact string before FOOTER might be just `</div>`s.
    # Let's use regex to find the end of the lender portal
    pattern = re.compile(r'</div>\s*</div>\s*</div>\s*\)\}\s*</div>\s*\{\/\* FOOTER \*\/\}')
    match = pattern.search(content)
    if match:
        insertion_idx = match.start()
        # the structure is currently:
        # <div class="bg-white ..."> (main container of lender)
        # </div>
        # </div> (the wrapper we just changed)
        # )}
        # </div>
        # FOOTER
        
        # We need to insert right_panel_content after the main container closes
        # So we look for the closing div of `bg-white p-10 rounded-3xl`
        # Let's just insert it before `</div>\n          </div>\n        )}`
        
        pass

# Since exact string manipulation of JSX is brittle, let's write a python AST or better, just use careful string splits.
