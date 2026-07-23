import re

file_path = "d:/vscode/SME_1/Microfinance-Loan-System/frontend/src/App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find RIGHT DASHBOARD PANEL
right_panel_start = content.find('{/* RIGHT DASHBOARD PANEL */}')
# End of right dashboard panel is before the lender portal starts
right_panel_end_idx = content.find('</div>\n          </div>\n        ) : (')

if right_panel_start != -1 and right_panel_end_idx != -1:
    right_panel = content[right_panel_start:right_panel_end_idx]
    
    # Remove from Borrower Portal
    content = content[:right_panel_start] + content[right_panel_end_idx:]
    
    # Now insert into Lender Portal
    # We need to change the Lender Portal wrapper
    # From:
    # /* LENDER PORTAL - FULL WIDTH */
    # <div className="h-full overflow-y-auto p-8 max-w-7xl mx-auto w-full">
    # To a flex container
    old_lender_wrapper = '/* LENDER PORTAL - FULL WIDTH */\n          <div className="h-full overflow-y-auto p-8 max-w-7xl mx-auto w-full">'
    new_lender_wrapper = '''/* LENDER PORTAL - TWO COLUMNS */
          <div className="h-full flex max-w-[1400px] mx-auto w-full p-6 gap-6 overflow-hidden">
            <div className="w-[62%] h-full overflow-y-auto pr-3 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">'''
    
    content = content.replace(old_lender_wrapper, new_lender_wrapper)
    
    # The lender portal ends before `{/* FOOTER */}`
    # specifically:
    #               </div>
    #             </div>
    #           </div>
    #         )}
    #       </div>
    # 
    #       {/* FOOTER */}
    
    # Let's find the closing of the lender portal content. The lender content currently ends with:
    #                 </div>
    #               </div>
    #             </div>
    #           </div>
    #         )}
    
    # Actually, let's just find `</div>\n          </div>\n        )}\n      </div>\n\n      {/* FOOTER */}`
    end_marker = '</div>\n            </div>\n          </div>\n        )}\n      </div>\n\n      {/* FOOTER */}'
    
    # Let's look at how it ends:
    # 1270:                 </div>
    # 1271:               </div>
    # 1272:             </div>
    # 1273:           </div>
    # 1274:         )}
    # 1275:       </div>
    # 1276: 
    # 1277:       {/* FOOTER */}
    
    # So line 1272 is `            </div>` (closes `bg-white p-10...`)
    # Line 1273 is `          </div>` (closes `h-full overflow-y-auto...`)
    
    # With our new wrapper, the `bg-white` div closes, then we need to close the left section (`w-[62%]...`),
    # then insert the right section, then close the main wrapper (`h-full flex...`).
    
    search_str = '            </div>\n          </div>\n        )}\n      </div>\n\n      {/* FOOTER */}'
    replace_str = f'''            </div>
            </div>
            
            {right_panel}
          </div>
        )}}
      </div>

      {{/* FOOTER */}}'''
      
    content = content.replace(search_str, replace_str)

    # Finally, add onClick to borrower marketplace cards
    borrower_card_search = 'className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative hover:shadow-md transition"'
    borrower_card_replace = '''className={`bg-white border ${selectedBorrower?._id === borrower._id ? 'border-[#044335] ring-2 ring-[#044335]' : 'border-gray-100'} rounded-2xl p-6 shadow-sm relative hover:shadow-md transition cursor-pointer`}
                      onClick={() => {
                        setSelectedBorrower(borrower);
                        setGstNumber(borrower.gst_number);
                        setLoanDetails({
                          loanAmount: borrower.loan_amount,
                          tenure: borrower.loan_tenure,
                          maxEmi: borrower.max_emi,
                          emergency: borrower.emergency_request ? "Yes" : "No"
                        });
                        setCreditHistory({
                          previousLoans: borrower.previous_loans ? "Yes" : "No",
                          defaults: borrower.defaults_history ? "Yes" : "No",
                          msme: borrower.registered_msme ? "Yes" : "No"
                        });
                        setRevenueData(null);
                        setForecastData(null);
                        setRiskData(null);
                        setTrustScore(null);
                        setLenders(null);
                      }}'''
    content = content.replace(borrower_card_search, borrower_card_replace)

    # Update Lender Name placeholder slightly to avoid conflict if any (not strictly needed)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done refactoring App.jsx")
