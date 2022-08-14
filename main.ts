import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
const Minio = require("minio");

interface S3PluginSettings {
	accessKey: string;
	secret: string;
	bucket: string;
	endpoint: string;
}

const DEFAULT_SETTINGS: S3PluginSettings = {
	accessKey: '',
	secret: '',
	bucket: 'obsidian',
	endpoint: 's3.eu-central-1.wasabisys.com'
}

export default class S3Plugin extends Plugin {
	settings: S3PluginSettings;

	async onload() {
		await this.loadSettings();

		var minioClient = new Minio.Client({
			endPoint: this.settings.endpoint,
			useSSL: true,
			accessKey: this.settings.accessKey,
			secretKey: this.settings.secret,
			pathStyle: true,
		});


		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'get-file-frontmatter',
			name: 'Get File Frontmatter',
			callback: () => {
				var file = this.app.workspace.getActiveFile()
				if (file) {
					var content = this.app.metadataCache.getFileCache(file);
					if (content?.frontmatter && content.frontmatter['published'] === true) {
						this.app.vault.read(file).then(lines => {
							minioClient.putObject(this.settings.bucket, this.app.workspace.getActiveFile()?.path, lines);
						})

					}
				}
			}
		});
		

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new S3SettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class S3SettingTab extends PluginSettingTab {
	plugin: S3Plugin;

	constructor(app: App, plugin: S3Plugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'S3 Publisher Settings.' });

		new Setting(containerEl)
			.setName('S3 Credentials')
			.setDesc('Enter your S3 creds here')
			.addText(text => text
				.setPlaceholder('Enter your key')
				.setValue(this.plugin.settings.accessKey)
				.onChange(async (value) => {
					this.plugin.settings.accessKey = value;
					await this.plugin.saveSettings();
				})).addText(text => text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.secret)
					.onChange(async (value) => {
						this.plugin.settings.secret = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('S3 Bucket')
			.setDesc('Enter your S3 config here')
			.addText(text => text
				.setPlaceholder('Enter your bucket')
				.setValue(this.plugin.settings.bucket)
				.onChange(async (value) => {
					this.plugin.settings.bucket = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('S3 Endpoint')
			.setDesc('Enter your S3 URL here')
			.addText(text => text
				.setPlaceholder('Enter your endpoint')
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
					this.plugin.settings.endpoint = value;
					await this.plugin.saveSettings();
				}));
	}
}
