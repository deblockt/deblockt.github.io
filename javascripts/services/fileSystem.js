define(['ffFileSystem'], function()
{
	
	
	var requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
	var storageInfo = navigator.webkitPersistentStorage;
    var service = {
		isSupported : function() {
			return requestFileSystem !== undefined;
		},
		initFs : function(size, onLoad, errorHandler){			
			var _this = this;
			if (storageInfo && storageInfo.requestQuota) {
				storageInfo.requestQuota(size, 
					function(grantedBytes) {
						requestFileSystem(PERSISTENT, size, function(fs){ 
							_this.init(fs);
							onLoad && onLoad(_this);
						}, function(error){console.log(error); errorHandler && errorHandler(error);});
					}, function(e) {
					  console.log('Error', e);
					  errorHandler && errorHandler(e);
					}
				);
			} else {
				requestFileSystem(
					PERSISTENT, 
					size, 
					function(fs){ service.init(fs); onLoad && onLoad(_this)},
					function(error){console.log(error); errorHandler && errorHandler(e)}
				);
			}	
		},
		init : function(fs) {
			this.fs = fs;
		},
		mkdir : function(dirPath, createdCallback, dirEntry) {
			var _this = this;
			dirEntry = dirEntry || this.fs.root;
			var folders = dirPath.split('/');
			dirEntry.getDirectory(folders[0], {create: true}, function(newDirEntry) {
				if (folders.length > 1) {
				  _this.mkdir(folders.slice(1).join('/'),createdCallback, newDirEntry);
				} else {
					createdCallback(newDirEntry);
				}
			}, function(error){console.log(error)});
		},
		listDir : function(dirPath, listDirCallback, errorFsHandler, dirEntry) {
			var _this = this;
			dirEntry = dirEntry || this.fs.root;
			var folders = dirPath.split('/');
			dirEntry.getDirectory(folders[0], {}, function(newDirEntry) {
				if (folders.length > 1) {
				  _this.listDir(folders.slice(1).join('/'),listDirCallback, errorFsHandler, newDirEntry);
				} else {
					var reader = newDirEntry.createReader();
					reader.readEntries (function(results) {
						var result = [];
						if (!results.length) {
							results.forEach(function(entry, i) {
								result.push(entry);
							});
						} else {
							result = results;
						}
						listDirCallback(result);
					}, function(error){console.log(error); errorFsHandler && errorFsHandler(error);})
				}
			}, function(error){console.log(error); errorFsHandler && errorFsHandler(error);});
		},
		/**
		 * create a file
		 */
		touch : function(filePath, createdCallback, onError, dirEntry) {
			dirEntry = dirEntry || this.fs.root;
			var _this = this;
			dirEntry.getFile(filePath, {create: true, exclusive: true}, function(fileEntry) {
				createdCallback(fileEntry);
			}, function(error) {console.log(error);onError && onError(error)});
		},
		/**
		 * read a file entry with a filepath 
		 */
		readFile : function(filePath, onLoaded, dirEntry) {
			dirEntry = dirEntry || this.fs.root;
			var _this = this;
			dirEntry.getFile(filePath, {}, function(fileEntry) {
				fileEntry.file(function(file){
					_this.readyFileEntry(file);
				});
			}, function(error) {console.log(error)});
		},
		/**
		 * read a file with a file entry
		 */
		readFileEntry : function(entry, onLoaded) {
			entry.file(function(file){
				var reader = new FileReader();
				reader.onloadend = function(e) { 
					onLoaded(e.target.result); 
				};
				reader.readAsText(file);
			});
		},
		writeFile : function(filePath, content, dirEntry) {
			dirEntry = dirEntry || this.fs.root;
			var _this = this;
			dirEntry.getFile(
				filePath,
				{},
				function(fileEntry) {
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function() {
							// after truncate operation
							if (fileWriter.length === 0) {								
								fileWriter.write(new Blob([content]));
							}
						};
						fileWriter.truncate(0);
					});
				}, 
				function(error) {console.log(error)}
			);
		},
		removeFile : function(filePath) {
			this.fs.root.getFile(
				filePath,
				{},
				function(fileEntry) {
					fileEntry.remove(function(){});
				},
				function(error) {
					console.log(error);
				}
			);
		}
	};
	
	return service;
});