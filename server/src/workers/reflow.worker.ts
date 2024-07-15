import { expose } from 'threads/worker';
import { reflowOptions } from '../backend/mxsReflow';
import { FormatData } from '../mxsFormatter';
//-----------------------------------------------------------------------------------
expose((data: string, settings: Partial<reflowOptions>) => FormatData(data, settings));