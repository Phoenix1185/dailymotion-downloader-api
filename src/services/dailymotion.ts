import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string;
  quality: string;
  filesize?: number;
  filesizeApprox?: number;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  url?: string;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
  uploadDate?: string;
  viewCount?: number;
  webpageUrl: string;
  formats: VideoFormat[];
  bestFormat?: VideoFormat;
}

export class DailyMotionService {
  private ytdlpPath: string;

  constructor() {
    this.ytdlpPath = process.env.YTDLP_PATH || 'yt-dlp';
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid DailyMotion URL. Expected format: https://www.dailymotion.com/video/VIDEO_ID');
      }

      logger.info(`Extracting info for video: ${videoId}`);

      const command = `${this.ytdlpPath} --dump-json --no-download --quiet "${url}"`;

      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stdout) {
        throw new Error(`yt-dlp error: ${stderr}`);
      }

      const rawInfo = JSON.parse(stdout);

      const formats: VideoFormat[] = (rawInfo.formats || []).map((f: any) => ({
        formatId: f.format_id,
        ext: f.ext,
        resolution: f.resolution || `${f.width}x${f.height}`,
        quality: f.quality_label || f.format_note || 'unknown',
        filesize: f.filesize,
        filesizeApprox: f.filesize_approx,
        videoCodec: f.vcodec,
        audioCodec: f.acodec,
        fps: f.fps,
        url: f.url,
        hasVideo: f.vcodec !== 'none',
        hasAudio: f.acodec !== 'none',
      }));

      formats.sort((a, b) => {
        const getHeight = (res: string) => {
          const match = res.match(/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        return getHeight(b.resolution) - getHeight(a.resolution);
      });

      const bestFormat = formats.find(f => f.hasVideo && f.hasAudio) || formats[0];

      return {
        id: rawInfo.id || videoId,
        title: rawInfo.title || 'Unknown Title',
        description: rawInfo.description,
        duration: rawInfo.duration || 0,
        thumbnail: rawInfo.thumbnail,
        uploader: rawInfo.uploader,
        uploadDate: rawInfo.upload_date,
        viewCount: rawInfo.view_count,
        webpageUrl: rawInfo.webpage_url || url,
        formats,
        bestFormat,
      };
    } catch (error: any) {
      logger.error('DailyMotion extraction error:', error);

      if (error.message?.includes('No video formats found')) {
        throw new Error('Video not available or geo-restricted. The video may be private, removed, or restricted in your region.');
      }
      if (error.message?.includes('HTTP Error 403')) {
        throw new Error('Access forbidden. The video may require authentication or be restricted.');
      }
      if (error.message?.includes('Unable to download')) {
        throw new Error('Failed to download video metadata. Please check the URL and try again.');
      }

      throw new Error(error.message || 'Failed to extract video information');
    }
  }

  async getDownloadUrl(url: string, quality?: string): Promise<{ url: string; format: VideoFormat; info: VideoInfo }> {
    const info = await this.getVideoInfo(url);

    let selectedFormat: VideoFormat;

    if (quality) {
      selectedFormat = info.formats.find(f => 
        f.quality.toLowerCase().includes(quality.toLowerCase()) &&
        f.hasVideo && f.hasAudio
      ) || info.bestFormat!;
    } else {
      selectedFormat = info.bestFormat!;
    }

    if (!selectedFormat?.url) {
      throw new Error('No downloadable format found for this video');
    }

    return {
      url: selectedFormat.url,
      format: selectedFormat,
      info,
    };
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
      /dai\.ly\/([a-zA-Z0-9]+)/,
      /dailymotion\.com\/embed\/video\/([a-zA-Z0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  async checkYtdlpInstallation(): Promise<boolean> {
    try {
      await execAsync(`${this.ytdlpPath} --version`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const dailyMotionService = new DailyMotionService();
