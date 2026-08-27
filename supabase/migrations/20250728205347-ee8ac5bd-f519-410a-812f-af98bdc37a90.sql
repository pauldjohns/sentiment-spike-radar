-- Create industry_tickers table and populate with the curated industry focus list
CREATE TABLE IF NOT EXISTS public.industry_tickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT,
  sector TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_tickers ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Industry tickers are viewable by everyone" 
ON public.industry_tickers 
FOR SELECT 
USING (true);

-- Create policy for service role to manage tickers
CREATE POLICY "Service role can manage industry tickers" 
ON public.industry_tickers 
FOR ALL 
USING (auth.role() = 'service_role');

-- Insert the industry focus tickers from the existing data structure
INSERT INTO public.industry_tickers (symbol, sector) VALUES
-- Defense & Aerospace
('LMT', 'Defense & Aerospace'), ('RTX', 'Defense & Aerospace'), ('BA', 'Defense & Aerospace'), ('NOC', 'Defense & Aerospace'), ('GD', 'Defense & Aerospace'),
('LHX', 'Defense & Aerospace'), ('HII', 'Defense & Aerospace'), ('TDG', 'Defense & Aerospace'), ('CW', 'Defense & Aerospace'), ('TXT', 'Defense & Aerospace'),
('HON', 'Defense & Aerospace'), ('UTX', 'Defense & Aerospace'), ('LDOS', 'Defense & Aerospace'), ('CACI', 'Defense & Aerospace'), ('SAIC', 'Defense & Aerospace'),
('KTOS', 'Defense & Aerospace'), ('AVAV', 'Defense & Aerospace'), ('MRCY', 'Defense & Aerospace'), ('OSK', 'Defense & Aerospace'), ('HXL', 'Defense & Aerospace'),
('AIR', 'Defense & Aerospace'), ('ERJ', 'Defense & Aerospace'), ('AJRD', 'Defense & Aerospace'), ('VSAT', 'Defense & Aerospace'), ('CMTL', 'Defense & Aerospace'),
('MOG.A', 'Defense & Aerospace'), ('MOG.B', 'Defense & Aerospace'), ('ESLT', 'Defense & Aerospace'), ('SPCE', 'Defense & Aerospace'), ('RKLB', 'Defense & Aerospace'),
('MAXR', 'Defense & Aerospace'), ('IRDM', 'Defense & Aerospace'), ('GILT', 'Defense & Aerospace'), ('PLTR', 'Defense & Aerospace'), ('BBAI', 'Defense & Aerospace'),
('RAVN', 'Defense & Aerospace'), ('ASTS', 'Defense & Aerospace'), ('LUNR', 'Defense & Aerospace'), ('VORB', 'Defense & Aerospace'), ('ASTR', 'Defense & Aerospace'),
('BLDE', 'Defense & Aerospace'), ('NPK', 'Defense & Aerospace'), ('CUB', 'Defense & Aerospace'), ('PWR', 'Defense & Aerospace'), ('BWXT', 'Defense & Aerospace'),
('WCC', 'Defense & Aerospace'), ('PLL', 'Defense & Aerospace'), ('ATI', 'Defense & Aerospace'), ('CENX', 'Defense & Aerospace'), ('ZEUS', 'Defense & Aerospace'),
('HEI', 'Defense & Aerospace'), ('HEI.A', 'Defense & Aerospace'), ('PH', 'Defense & Aerospace'), ('PCP', 'Defense & Aerospace'), ('B', 'Defense & Aerospace'),
('IR', 'Defense & Aerospace'), ('ITT', 'Defense & Aerospace'), ('FLS', 'Defense & Aerospace'), ('EMR', 'Defense & Aerospace'), ('ROP', 'Defense & Aerospace'),
('DHR', 'Defense & Aerospace'), ('ETN', 'Defense & Aerospace'), ('MMM', 'Defense & Aerospace'), ('GE', 'Defense & Aerospace'), ('CAT', 'Defense & Aerospace'),
('DE', 'Defense & Aerospace'), ('CMI', 'Defense & Aerospace'), ('EME', 'Defense & Aerospace'), ('FTV', 'Defense & Aerospace'), ('AME', 'Defense & Aerospace'),
('AXON', 'Defense & Aerospace'), ('FLIR', 'Defense & Aerospace'), ('TRMB', 'Defense & Aerospace'), ('GRMN', 'Defense & Aerospace'), ('NVDA', 'Defense & Aerospace'),
('AMD', 'Defense & Aerospace'), ('INTC', 'Defense & Aerospace'), ('QCOM', 'Defense & Aerospace'), ('MRVL', 'Defense & Aerospace'), ('TER', 'Defense & Aerospace'),
('ADI', 'Defense & Aerospace'), ('AMAT', 'Defense & Aerospace'), ('LRCX', 'Defense & Aerospace'), ('KLAC', 'Defense & Aerospace'), ('MU', 'Defense & Aerospace'),
('WDC', 'Defense & Aerospace'), ('STX', 'Defense & Aerospace'), ('NTAP', 'Defense & Aerospace'), ('NTNX', 'Defense & Aerospace'), ('PURE', 'Defense & Aerospace'),
('DDOG', 'Defense & Aerospace'), ('SNOW', 'Defense & Aerospace'), ('NET', 'Defense & Aerospace'), ('ZS', 'Defense & Aerospace'), ('OKTA', 'Defense & Aerospace'),
('CRWD', 'Defense & Aerospace'), ('PANW', 'Defense & Aerospace'), ('FTNT', 'Defense & Aerospace'), ('CYBR', 'Defense & Aerospace'), ('QLYS', 'Defense & Aerospace'),
('SPLK', 'Defense & Aerospace'), ('VEEV', 'Defense & Aerospace'), ('NOW', 'Defense & Aerospace'), ('CRM', 'Defense & Aerospace'), ('WDAY', 'Defense & Aerospace'),
('ADSK', 'Defense & Aerospace'), ('ANSS', 'Defense & Aerospace'), ('CDNS', 'Defense & Aerospace'), ('SNPS', 'Defense & Aerospace'), ('MSFT', 'Defense & Aerospace'),
('ORCL', 'Defense & Aerospace'), ('IBM', 'Defense & Aerospace'), ('CSCO', 'Defense & Aerospace'), ('HPE', 'Defense & Aerospace'), ('HPQ', 'Defense & Aerospace'),
('DELL', 'Defense & Aerospace'), ('VMW', 'Defense & Aerospace'), ('AVGO', 'Defense & Aerospace'), ('TXN', 'Defense & Aerospace'), ('XLNX', 'Defense & Aerospace'),

-- Energy & Renewables  
('XOM', 'Energy & Renewables'), ('CVX', 'Energy & Renewables'), ('COP', 'Energy & Renewables'), ('EOG', 'Energy & Renewables'), ('SLB', 'Energy & Renewables'),
('PXD', 'Energy & Renewables'), ('KMI', 'Energy & Renewables'), ('OKE', 'Energy & Renewables'), ('WMB', 'Energy & Renewables'), ('EPD', 'Energy & Renewables'),
('MPC', 'Energy & Renewables'), ('VLO', 'Energy & Renewables'), ('PSX', 'Energy & Renewables'), ('HES', 'Energy & Renewables'), ('DVN', 'Energy & Renewables'),
('FANG', 'Energy & Renewables'), ('APA', 'Energy & Renewables'), ('EQT', 'Energy & Renewables'), ('CNX', 'Energy & Renewables'), ('AR', 'Energy & Renewables'),
('MRO', 'Energy & Renewables'), ('OXY', 'Energy & Renewables'), ('HAL', 'Energy & Renewables'), ('BKR', 'Energy & Renewables'), ('NOV', 'Energy & Renewables'),
('FTI', 'Energy & Renewables'), ('HP', 'Energy & Renewables'), ('RIG', 'Energy & Renewables'), ('NBR', 'Energy & Renewables'), ('PTEN', 'Energy & Renewables'),
('CLR', 'Energy & Renewables'), ('SM', 'Energy & Renewables'), ('MTDR', 'Energy & Renewables'), ('MGY', 'Energy & Renewables'), ('PE', 'Energy & Renewables'),
('CTRA', 'Energy & Renewables'), ('OVV', 'Energy & Renewables'), ('PR', 'Energy & Renewables'), ('GPOR', 'Energy & Renewables'), ('CRGY', 'Energy & Renewables'),
('NEE', 'Energy & Renewables'), ('ENPH', 'Energy & Renewables'), ('SEDG', 'Energy & Renewables'), ('RUN', 'Energy & Renewables'), ('SPWR', 'Energy & Renewables'),
('FSLR', 'Energy & Renewables'), ('JKS', 'Energy & Renewables'), ('CSIQ', 'Energy & Renewables'), ('DQ', 'Energy & Renewables'), ('SOL', 'Energy & Renewables'),
('NOVA', 'Energy & Renewables'), ('ARRY', 'Energy & Renewables'), ('MAXN', 'Energy & Renewables'), ('SHLS', 'Energy & Renewables'), ('VSLR', 'Energy & Renewables'),
('AMPS', 'Energy & Renewables'), ('PLUG', 'Energy & Renewables'), ('FCEL', 'Energy & Renewables'), ('BE', 'Energy & Renewables'), ('BLDP', 'Energy & Renewables'),
('HYGS', 'Energy & Renewables'), ('NKLA', 'Energy & Renewables'), ('HYLN', 'Energy & Renewables'), ('WKHS', 'Energy & Renewables'), ('QS', 'Energy & Renewables'),
('SBE', 'Energy & Renewables'), ('RIDE', 'Energy & Renewables'), ('GOEV', 'Energy & Renewables'), ('ACTC', 'Energy & Renewables'), ('CCIV', 'Energy & Renewables'),
('SO', 'Energy & Renewables'), ('DUK', 'Energy & Renewables'), ('AEP', 'Energy & Renewables'), ('EXC', 'Energy & Renewables'), ('XEL', 'Energy & Renewables'),
('WEC', 'Energy & Renewables'), ('ES', 'Energy & Renewables'), ('AWK', 'Energy & Renewables'), ('D', 'Energy & Renewables'), ('PCG', 'Energy & Renewables'),
('EIX', 'Energy & Renewables'), ('SRE', 'Energy & Renewables'), ('PEG', 'Energy & Renewables'), ('ED', 'Energy & Renewables'), ('ETR', 'Energy & Renewables'),
('FE', 'Energy & Renewables'), ('AES', 'Energy & Renewables'), ('CNP', 'Energy & Renewables'), ('NI', 'Energy & Renewables'), ('PPL', 'Energy & Renewables'),
('LNT', 'Energy & Renewables'), ('EVRG', 'Energy & Renewables'), ('CMS', 'Energy & Renewables'), ('DTE', 'Energy & Renewables'), ('ATO', 'Energy & Renewables'),
('WTR', 'Energy & Renewables'), ('AQUA', 'Energy & Renewables'), ('MSEX', 'Energy & Renewables'), ('CWCO', 'Energy & Renewables'), ('IDA', 'Energy & Renewables'),
('VAL', 'Energy & Renewables'), ('WTTR', 'Energy & Renewables'), ('RES', 'Energy & Renewables'), ('LBRT', 'Energy & Renewables'), ('PUMP', 'Energy & Renewables'),
('WHD', 'Energy & Renewables'), ('CLB', 'Energy & Renewables'), ('CHX', 'Energy & Renewables'), ('AROC', 'Energy & Renewables'), ('ACDC', 'Energy & Renewables'),
('NINE', 'Energy & Renewables'), ('SLCA', 'Energy & Renewables'), ('FRAC', 'Energy & Renewables'), ('RNGR', 'Energy & Renewables'), ('PAHC', 'Energy & Renewables'),
('TTEK', 'Energy & Renewables'), ('NCS', 'Energy & Renewables'), ('CCJ', 'Energy & Renewables'), ('UEC', 'Energy & Renewables'), ('UUUU', 'Energy & Renewables'),
('DNN', 'Energy & Renewables'), ('LEU', 'Energy & Renewables'), ('URG', 'Energy & Renewables'), ('UROY', 'Energy & Renewables'), ('GURE', 'Energy & Renewables'),
('NXE', 'Energy & Renewables'), ('LTBR', 'Energy & Renewables'), ('TELL', 'Energy & Renewables'), ('KNTK', 'Energy & Renewables'), ('GLNG', 'Energy & Renewables'),
('LNG', 'Energy & Renewables'), ('EQM', 'Energy & Renewables'), ('KELT', 'Energy & Renewables'), ('CR', 'Energy & Renewables'), ('CDEV', 'Energy & Renewables'),
('CHRD', 'Energy & Renewables'), ('ESTE', 'Energy & Renewables'), ('TALO', 'Energy & Renewables'), ('GPRE', 'Energy & Renewables'), ('REX', 'Energy & Renewables'),

-- Biotech & Pharma
('JNJ', 'Biotech & Pharma'), ('PFE', 'Biotech & Pharma'), ('ABBV', 'Biotech & Pharma'), ('LLY', 'Biotech & Pharma'), ('MRK', 'Biotech & Pharma'),
('TMO', 'Biotech & Pharma'), ('ABT', 'Biotech & Pharma'), ('GILD', 'Biotech & Pharma'), ('AMGN', 'Biotech & Pharma'), ('REGN', 'Biotech & Pharma'),
('BIIB', 'Biotech & Pharma'), ('VRTX', 'Biotech & Pharma'), ('ILMN', 'Biotech & Pharma'), ('MRNA', 'Biotech & Pharma'), ('BNTX', 'Biotech & Pharma'),
('NVAX', 'Biotech & Pharma'), ('INO', 'Biotech & Pharma'), ('OCGN', 'Biotech & Pharma'), ('VXRT', 'Biotech & Pharma'), ('SAVA', 'Biotech & Pharma'),
('BMRN', 'Biotech & Pharma'), ('ALNY', 'Biotech & Pharma'), ('IONS', 'Biotech & Pharma'), ('SRPT', 'Biotech & Pharma'), ('RARE', 'Biotech & Pharma'),
('FOLD', 'Biotech & Pharma'), ('ARWR', 'Biotech & Pharma'), ('EDIT', 'Biotech & Pharma'), ('NTLA', 'Biotech & Pharma'), ('CRSP', 'Biotech & Pharma'),
('BEAM', 'Biotech & Pharma'), ('PRIME', 'Biotech & Pharma'), ('VERV', 'Biotech & Pharma'), ('SGMO', 'Biotech & Pharma'), ('BLUE', 'Biotech & Pharma'),
('FATE', 'Biotech & Pharma'), ('CRBU', 'Biotech & Pharma'), ('CYTK', 'Biotech & Pharma'), ('MRUS', 'Biotech & Pharma'), ('TCDA', 'Biotech & Pharma'),
('ZLAB', 'Biotech & Pharma'), ('HALO', 'Biotech & Pharma'), ('SAGE', 'Biotech & Pharma'), ('PTCT', 'Biotech & Pharma'), ('ACAD', 'Biotech & Pharma'),
('INCY', 'Biotech & Pharma'), ('EXEL', 'Biotech & Pharma'), ('JAZZ', 'Biotech & Pharma'), ('UTHR', 'Biotech & Pharma'), ('TECH', 'Biotech & Pharma'),
('ALLO', 'Biotech & Pharma'), ('BLCM', 'Biotech & Pharma'), ('CARA', 'Biotech & Pharma'), ('CLVS', 'Biotech & Pharma'), ('FGEN', 'Biotech & Pharma'),
('GTHX', 'Biotech & Pharma'), ('HZNP', 'Biotech & Pharma'), ('IMMU', 'Biotech & Pharma'), ('KPTI', 'Biotech & Pharma'), ('LGND', 'Biotech & Pharma'),
('MGNX', 'Biotech & Pharma'), ('NKTR', 'Biotech & Pharma'), ('PCRX', 'Biotech & Pharma'), ('PTGX', 'Biotech & Pharma'), ('RYTM', 'Biotech & Pharma'),
('SGEN', 'Biotech & Pharma'), ('TBPH', 'Biotech & Pharma'), ('VCEL', 'Biotech & Pharma'), ('XENE', 'Biotech & Pharma'), ('YMAB', 'Biotech & Pharma'),
('ADAP', 'Biotech & Pharma'), ('ANIK', 'Biotech & Pharma'), ('ATRA', 'Biotech & Pharma'), ('BDTX', 'Biotech & Pharma'), ('CGEM', 'Biotech & Pharma'),
('DMAC', 'Biotech & Pharma'), ('EOLS', 'Biotech & Pharma'), ('FMTX', 'Biotech & Pharma'), ('GOSS', 'Biotech & Pharma'), ('HRTX', 'Biotech & Pharma'),
('IGMS', 'Biotech & Pharma'), ('KDNY', 'Biotech & Pharma'), ('LPTX', 'Biotech & Pharma'), ('MTEM', 'Biotech & Pharma'), ('NRIX', 'Biotech & Pharma'),
('OPCH', 'Biotech & Pharma'), ('PRTA', 'Biotech & Pharma'), ('RVMD', 'Biotech & Pharma'), ('SNDX', 'Biotech & Pharma'), ('TPTX', 'Biotech & Pharma'),
('VERA', 'Biotech & Pharma'), ('WVVI', 'Biotech & Pharma'), ('XAIR', 'Biotech & Pharma'), ('ZNTL', 'Biotech & Pharma'), ('ALEC', 'Biotech & Pharma'),
('BCYC', 'Biotech & Pharma'), ('CDNA', 'Biotech & Pharma'), ('DVAX', 'Biotech & Pharma'), ('ELVN', 'Biotech & Pharma'), ('FDMT', 'Biotech & Pharma'),
('GLPG', 'Biotech & Pharma'), ('HRVS', 'Biotech & Pharma'), ('ITCI', 'Biotech & Pharma'), ('KRYS', 'Biotech & Pharma'), ('LNTH', 'Biotech & Pharma'),
('MDGL', 'Biotech & Pharma'), ('NBIX', 'Biotech & Pharma'), ('OSUR', 'Biotech & Pharma'), ('PGNX', 'Biotech & Pharma'), ('RVNC', 'Biotech & Pharma'),
('SDGR', 'Biotech & Pharma'), ('TVTX', 'Biotech & Pharma'), ('VKTX', 'Biotech & Pharma'), ('XLRN', 'Biotech & Pharma'), ('ZYME', 'Biotech & Pharma'),
('ABUS', 'Biotech & Pharma'), ('BCRX', 'Biotech & Pharma'), ('CLDX', 'Biotech & Pharma'), ('DCPH', 'Biotech & Pharma'), ('EPZM', 'Biotech & Pharma'),
('GMAB', 'Biotech & Pharma'), ('HOOK', 'Biotech & Pharma'), ('IMGN', 'Biotech & Pharma'), ('KALA', 'Biotech & Pharma'), ('LARK', 'Biotech & Pharma'),
('MRNS', 'Biotech & Pharma'), ('NVCR', 'Biotech & Pharma'), ('OCUL', 'Biotech & Pharma'), ('PHAT', 'Biotech & Pharma'), ('RGNX', 'Biotech & Pharma'),
('SMFR', 'Biotech & Pharma'), ('TRVN', 'Biotech & Pharma'), ('VSTM', 'Biotech & Pharma'), ('XNCR', 'Biotech & Pharma'), ('ZYXI', 'Biotech & Pharma'),
('AVDL', 'Biotech & Pharma'), ('CPRX', 'Biotech & Pharma'), ('DRNA', 'Biotech & Pharma'), ('EYEG', 'Biotech & Pharma')

ON CONFLICT (symbol) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industry_tickers_updated_at
    BEFORE UPDATE ON public.industry_tickers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();