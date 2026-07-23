import re

file_path = "d:/vscode/SME_1/Microfinance-Loan-System/frontend/src/App.jsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add requestLender function
func_to_add = '''
  const requestLender = async (lenderId) => {
    try {
      const payload = {
        lender_id: lenderId,
        borrower_name: businessDetails.businessName || "Unknown Business"
      };
      const response = await API.post("/request-lender", payload);
      alert(response.data.message);
    } catch (error) {
      console.log(error);
      alert("Failed to request lender");
    }
  };
'''
insert_func_after = "const deleteBorrower = async (borrowerId) => {"
if insert_func_after in content:
    # Just put it before the useEffect
    content = content.replace("useEffect(() => {", func_to_add + "\n  useEffect(() => {", 1)


# 2. Add Lender Marketplace UI
lender_marketplace_ui = '''
              {/* SECTION 6 — Lender Marketplace */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition duration-200 hover:shadow-md">
                <SectionHeader
                  title="Section 6 — Lender Marketplace"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                />
                
                <div className="grid grid-cols-2 gap-6 mt-4">
                  {allLenders.map((lender, index) => (
                    <div key={index} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-sm">
                      <h4 className="font-bold text-gray-800 text-base mb-1">{lender.lender_name}</h4>
                      <p className="text-xs text-gray-500 mb-3">{lender.organization}</p>
                      
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                        <span>Rate: <span className="font-bold text-gray-800">{lender.interest_rate}%</span></span>
                        <span>Risk: <span className="font-bold text-gray-800">{lender.maximum_risk}</span></span>
                      </div>
                      
                      <button
                        onClick={(e) => {
                           e.preventDefault();
                           requestLender(lender._id);
                        }}
                        className="w-full bg-[#e6f4f1] hover:bg-[#d5ebe7] text-[#044335] font-bold py-2.5 rounded-xl transition text-xs"
                      >
                        Request Loan
                      </button>
                    </div>
                  ))}
                  
                  {allLenders.length === 0 && (
                     <p className="text-sm text-gray-400 col-span-2 text-center py-4">No lenders available at the moment.</p>
                  )}
                </div>
              </div>
'''

insert_ui_before = "{/* Submit Application */}"
if insert_ui_before in content:
    content = content.replace(insert_ui_before, lender_marketplace_ui + "\n              " + insert_ui_before, 1)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated App.jsx successfully.")
