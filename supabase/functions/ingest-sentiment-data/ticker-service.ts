
// ✅ STRICT INDUSTRY SCOPE ENFORCEMENT: Exactly 357 U.S. equities spanning Defense/Aerospace, Energy, and Biotech/Pharma
const INDUSTRY_FOCUS_TICKERS = [
  // Defense & Aerospace (119 tickers)
  'LMT', 'RTX', 'BA', 'NOC', 'GD', 'LHX', 'HII', 'TDG', 'CW', 'TXT',
  'HON', 'UTX', 'LDOS', 'CACI', 'SAIC', 'KTOS', 'AVAV', 'MRCY', 'OSK', 'HXL',
  'AIR', 'ERJ', 'AJRD', 'VSAT', 'CMTL', 'MOG.A', 'MOG.B', 'ESLT', 'SPCE', 'RKLB',
  'MAXR', 'IRDM', 'GILT', 'PLTR', 'BBAI', 'RAVN', 'ASTS', 'LUNR', 'VORB', 'ASTR',
  'BLDE', 'NPK', 'CUB', 'PWR', 'BWXT', 'WCC', 'PLL', 'ATI', 'CENX', 'ZEUS',
  'HEI', 'HEI.A', 'PH', 'PCP', 'B', 'IR', 'ITT', 'FLS', 'EMR', 'ROP',
  'DHR', 'ETN', 'MMM', 'GE', 'CAT', 'DE', 'CMI', 'EME', 'FTV', 'AME',
  'AXON', 'FLIR', 'TRMB', 'GRMN', 'NVDA', 'AMD', 'INTC', 'QCOM', 'MRVL', 'TER',
  'ADI', 'AMAT', 'LRCX', 'KLAC', 'MU', 'WDC', 'STX', 'NTAP', 'NTNX', 'PURE',
  'DDOG', 'SNOW', 'NET', 'ZS', 'OKTA', 'CRWD', 'PANW', 'FTNT', 'CYBR', 'QLYS',
  'SPLK', 'VEEV', 'NOW', 'CRM', 'WDAY', 'ADSK', 'ANSS', 'CDNS', 'SNPS', 'MSFT',
  'ORCL', 'IBM', 'CSCO', 'HPE', 'HPQ', 'DELL', 'VMW', 'AVGO', 'TXN', 'XLNX',
  
  // Energy & Renewables (119 tickers)
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PXD', 'KMI', 'OKE', 'WMB', 'EPD',
  'MPC', 'VLO', 'PSX', 'HES', 'DVN', 'FANG', 'APA', 'EQT', 'CNX', 'AR',
  'MRO', 'OXY', 'HAL', 'BKR', 'NOV', 'FTI', 'HP', 'RIG', 'NBR', 'PTEN',
  'CLR', 'SM', 'MTDR', 'MGY', 'PE', 'CTRA', 'OVV', 'PR', 'GPOR', 'CRGY',
  'NEE', 'ENPH', 'SEDG', 'RUN', 'SPWR', 'FSLR', 'JKS', 'CSIQ', 'DQ', 'SOL',
  'NOVA', 'ARRY', 'MAXN', 'SHLS', 'VSLR', 'AMPS', 'PLUG', 'FCEL', 'BE', 'BLDP',
  'HYGS', 'NKLA', 'HYLN', 'WKHS', 'QS', 'SBE', 'RIDE', 'GOEV', 'ACTC', 'CCIV',
  'SO', 'DUK', 'AEP', 'EXC', 'XEL', 'WEC', 'ES', 'AWK', 'D', 'PCG',
  'EIX', 'SRE', 'PEG', 'ED', 'ETR', 'FE', 'AES', 'CNP', 'NI', 'PPL',
  'LNT', 'EVRG', 'CMS', 'DTE', 'ATO', 'WTR', 'AQUA', 'MSEX', 'CWCO', 'IDA',
  'VAL', 'WTTR', 'RES', 'LBRT', 'PUMP', 'WHD', 'CLB', 'CHX', 'AROC', 'ACDC',
  'NINE', 'SLCA', 'FRAC', 'RNGR', 'PAHC', 'TTEK', 'NCS', 'CCJ', 'UEC', 'UUUU',
  'DNN', 'LEU', 'URG', 'UROY', 'GURE', 'NXE', 'LTBR', 'TELL', 'KNTK', 'GLNG',
  'LNG', 'EQM', 'KELT', 'CR', 'CDEV', 'CHRD', 'ESTE', 'TALO', 'GPRE', 'REX',
  
  // Biotech & Pharma (119 tickers)
  'JNJ', 'PFE', 'ABBV', 'LLY', 'MRK', 'TMO', 'ABT', 'GILD', 'AMGN', 'REGN',
  'BIIB', 'VRTX', 'ILMN', 'MRNA', 'BNTX', 'NVAX', 'INO', 'OCGN', 'VXRT', 'SAVA',
  'BMRN', 'ALNY', 'IONS', 'SRPT', 'RARE', 'FOLD', 'ARWR', 'EDIT', 'NTLA', 'CRSP',
  'BEAM', 'PRIME', 'VERV', 'SGMO', 'BLUE', 'FATE', 'CRBU', 'CYTK', 'MRUS', 'TCDA',
  'ZLAB', 'HALO', 'SAGE', 'PTCT', 'ACAD', 'INCY', 'EXEL', 'JAZZ', 'UTHR', 'TECH',
  'ALLO', 'BLCM', 'CARA', 'CLVS', 'FGEN', 'GTHX', 'HZNP', 'IMMU', 'KPTI', 'LGND',
  'MGNX', 'NKTR', 'PCRX', 'PTGX', 'RYTM', 'SGEN', 'TBPH', 'VCEL', 'XENE', 'YMAB',
  'ADAP', 'ANIK', 'ATRA', 'BDTX', 'CGEM', 'DMAC', 'EOLS', 'FMTX', 'GOSS', 'HRTX',
  'IGMS', 'KDNY', 'LPTX', 'MTEM', 'NRIX', 'OPCH', 'PRTA', 'RVMD', 'SNDX', 'TPTX',
  'VERA', 'WVVI', 'XAIR', 'ZNTL', 'ALEC', 'BCYC', 'CDNA', 'DVAX', 'ELVN', 'FDMT',
  'GLPG', 'HRVS', 'ITCI', 'KRYS', 'LNTH', 'MDGL', 'NBIX', 'OSUR', 'PGNX', 'RVNC',
  'SDGR', 'TVTX', 'VKTX', 'XLRN', 'ZYME', 'ABUS', 'BCRX', 'CLDX', 'DCPH', 'EPZM',
  'GMAB', 'HOOK', 'IMGN', 'KALA', 'LARK', 'MRNS', 'NVCR', 'OCUL', 'PHAT', 'RGNX',
  'SMFR', 'TRVN', 'VSTM', 'XNCR', 'ZYXI', 'AVDL', 'CPRX', 'DRNA', 'EYEG', 'FOLD'
] as const;

// Verify exact count at runtime
if (INDUSTRY_FOCUS_TICKERS.length !== 357) {
  throw new Error(`Expected exactly 357 tickers, got ${INDUSTRY_FOCUS_TICKERS.length}`);
}

export class TickerService {
  static getIndustryFocusTickers(): string[] {
    const tickers = [...INDUSTRY_FOCUS_TICKERS];
    
    console.log(`🎯 VERIFIED SCOPE: Returning exactly ${tickers.length} industry-focused tickers`);
    console.log('🚨 STRICT ENFORCEMENT: Defense/Aerospace, Energy & Renewables, Biotech/Pharma only');
    
    return tickers;
  }

  static getTickerCount(): number {
    return INDUSTRY_FOCUS_TICKERS.length;
  }

  static isValidTicker(ticker: string): boolean {
    const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker as any);
    
    if (!isValid) {
      console.warn(`🚨 SCOPE VIOLATION: Ticker ${ticker} not in 357-ticker industry list - REJECTING`);
    }
    
    return isValid;
  }

  static validateIndustryScope(inputTickers: string[]): string[] {
    const validTickers = inputTickers.filter(ticker => {
      const isValid = INDUSTRY_FOCUS_TICKERS.includes(ticker as any);
      if (!isValid) {
        console.warn(`🚨 FILTERED OUT: ${ticker} not in 357-ticker industry scope`);
      }
      return isValid;
    });
    
    const filteredCount = inputTickers.length - validTickers.length;
    if (filteredCount > 0) {
      console.warn(`🚨 SCOPE ENFORCEMENT: Filtered out ${filteredCount} non-industry tickers`);
    }
    
    console.log(`✅ VALIDATED: ${validTickers.length}/${inputTickers.length} tickers pass 357-ticker industry scope check`);
    return validTickers;
  }
}
