# Monthly Reports Feature Guide

## Overview

The Completed Orders section now supports generating reports organized by month, with each month appearing as a separate tab in the Excel file.

## How to Generate Monthly Reports

### Step 1: Select Date Range

1. Go to **Management → Completed Orders**
2. Select your date range:
   - **Start Date**: The beginning of your reporting period
   - **End Date**: The end of your reporting period

### Step 2: Generate Report

1. Click the **"Generate Report"** button
2. The Report Export Dialog will open with 3 steps

### Step 3: Select Content (Step 1)

Choose what information to include:
- Products and Quantities
- Raw Ingredients Breakdown
- Material Costs
- Production Costs
- Overhead Costs
- Quality Control Data
- Order Notes and Comments

### Step 4: Choose Organization (Step 2)

Select **"Monthly Reports"** option:
- **Individual Orders**: Each order gets its own tab
- **Monthly Reports**: ✅ Each month gets its own tab
- **Consolidated Summary**: All orders combined in one report

### Step 5: Select Format & Export

1. Choose your report format:
   - Detailed (All information)
   - Summary (Totals only)
   - Custom (Your selected components)

2. Choose file type:
   - Excel (.xlsx) - Recommended for monthly reports
   - PDF (.pdf)

3. Click **"Export Report"**

## What You Get

### Excel File Structure

When you select **Monthly Reports**, the Excel file will contain:

1. **Report Summary Tab**: Overall totals for the entire date range
2. **Individual Month Tabs**: One tab for each month in your date range
   - Tab name: "January 2026", "February 2026", etc.
   - Each tab contains that month's complete report

### Example

If you select **January 1, 2026 to March 31, 2026**, you'll get:
- **Report Summary** (All 3 months combined)
- **March 2026** (March orders only)
- **February 2026** (February orders only)
- **January 2026** (January orders only)

## Monthly Report Contents

Each monthly tab includes (based on your selections):

### Key Metrics
- Material Costs
- Production Costs
- Overhead Costs
- Total Cost
- Total Rejects
- Reject Rate
- Production Efficiency

### Product Summary
- Product name
- Quantity produced
- Rejects (if enabled)
- Unit

### Ingredient Usage
- Ingredient name
- Amount used
- Unit
- Cost (if enabled)

### Reject Details
- Product
- Reject quantity
- Notes

### Order Notes
- Order IDs
- Special notes

## Tips

### For Single Month Reports
- Set both start and end date within the same month
- You'll get one monthly tab with that month's data

### For Multiple Months
- Select a date range spanning multiple months
- Each month automatically gets its own tab
- Perfect for quarterly or year-end reports

### Best Practices
- Use Excel format for monthly reports (better multi-tab support)
- Select "Detailed" format for comprehensive monthly breakdowns
- Export monthly reports at month-end for accurate records
- Archive monthly reports for historical tracking

## Benefits

✅ **Organized**: Each month is cleanly separated
✅ **Comparable**: Easy to compare month-to-month performance
✅ **Professional**: Ready for management review
✅ **Flexible**: Choose exactly what data to include
✅ **Complete**: Summary tab provides overall totals
✅ **Efficient**: Generate multi-month reports in seconds

## Notes

- Months are based on the **production date** (completion date) of orders
- Months are sorted from newest to oldest
- Empty months (no orders) are not included in the report
- Month names are automatically formatted (e.g., "January 2026")
- Excel tab names are limited to 31 characters (Excel limitation)
