import { throws } from 'assert';
import { Client } from 'minio';
import { App, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

interface S3PluginSettings {
	accessKey: string;
	secret: string;
	bucket: string;
	endpoint: string;
	defaultFolder: string;
	tag: string;
}

const DEFAULT_SETTINGS: S3PluginSettings = {
	accessKey: '',
	secret: '',
	bucket: 'obsidian',
	endpoint: 's3.eu-central-1.wasabisys.com',
	defaultFolder: '',
	tag: 'published'
}

export default class S3Plugin extends Plugin {
	settings: S3PluginSettings;

	async onload() {
		await this.loadSettings();

		var minioClient = new Client({
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
			id: 'S3 Publish File',
			name: 'Upload Active File to S3',
			callback: () => {
				var file = this.app.workspace.getActiveFile()
				if (file) {
					this.handleFile(file, minioClient);
				}
			}
		});

		this.addCommand({
			id: 'S3 Publish All Files',
			name: 'Scan Workspace and upload to S3',
			callback: () => {
				this.app.vault.getMarkdownFiles().forEach(file => {
					this.handleFile(file, minioClient);
				});
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new S3SettingTab(this.app, this));
	}

	handleFile(file: TFile, client: Client) {
		var content = this.app.metadataCache.getFileCache(file);
		if (content?.frontmatter && content.frontmatter[this.settings.tag] === true) {
			this.app.vault.read(file).then(lines => {
				let now = new Date();
				let type = content?.frontmatter && content.frontmatter["type"] ? content.frontmatter["type"] + "/" : "";
				let pub_name = `${type}${file.name.replace(/\s/g, "-")}`
				if (type === "blog/") {
					pub_name = `${type}${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(2)}-${now.getDate()}.md`
				}
				client.putObject(this.settings.bucket, pub_name, lines).then(res => {
					console.log(`${pub_name} published`)
				}).catch(e => {
					console.error(e)
				})
			})
		}
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
				.setPlaceholder('Access Key')
				.setValue(this.plugin.settings.accessKey)
				.onChange(async (value) => {
					this.plugin.settings.accessKey = value;
					await this.plugin.saveSettings();
				})).addText(text => text
					.setPlaceholder('Secret')
					.setValue(this.plugin.settings.secret)
					.onChange(async (value) => {
						this.plugin.settings.secret = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('S3 Bucket')
			.setDesc('Enter your S3 config here')
			.addText(text => text
				.setPlaceholder('Bucket')
				.setValue(this.plugin.settings.bucket)
				.onChange(async (value) => {
					this.plugin.settings.bucket = value;
					await this.plugin.saveSettings();
				})).addText(text => text
					.setPlaceholder('Default Folder')
					.setValue(this.plugin.settings.defaultFolder)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolder = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
			.setName('S3 Endpoint')
			.setDesc('Enter your S3 URL here')
			.addText(text => text
				.setPlaceholder('Endpoint')
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
					this.plugin.settings.endpoint = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Tag')
			.setDesc('Enter the tag name in the frontmatter for files to publish')
			.addText(text => text
				.setPlaceholder('Tag')
				.setValue(this.plugin.settings.tag)
				.onChange(async (value) => {
					this.plugin.settings.tag = value;
					await this.plugin.saveSettings();
				}));
	}
}
