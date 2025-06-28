const DefaultSettings = 
{
    "DEBUG": false,
    "ENABLE": true,
    "SAVAGE_STRIKE_CANCEL": false,
    "SAVAGE_STRIKE_DOUBLE": false,
    "SAVAGE_STRIKE_CANCEL_AWSD": true,
    "SAVAGE_STRIKE_DELAY": 300,
    "KNOCKDOWN_FAST": true,
    "FORCE_PUNISHING_BLOW": true,
    "AUTO_MEASURED_SLICE": true,
    "FORCE_HEADLONG_RUSH": true,
    "OVERPOWER_NOTIFY": true
}

module.exports = function MigrateSettings(from_ver, to_ver, settings)
{
    if(from_ver === undefined)
    {
        return Object.assign(Object.assign({}, DefaultSettings), settings);
    }
    else if(from_ver === null)
    {
        return DefaultSettings;
    }
    else
    {
		if(from_ver + 1 < to_ver)
        {
			settings = MigrateSettings(from_ver, from_ver + 1, settings);
			return MigrateSettings(from_ver + 1, to_ver, settings);
		}
		switch(to_ver)
        {
			default:
				let oldsettings = settings;
				
                settings = Object.assign(DefaultSettings, {});

				for(let option in oldsettings)
                {
					if(settings[option])
                    {
						settings[option] = oldsettings[option];
					}
				}

				if(from_ver < to_ver)
                {
                    console.log('<font color=\'#04ACEC\'>DRAGON-SLAYER:</font> Your settings have been updated to version ' + to_ver + '.');
                    console.log('<font color=\'#04ACEC\'>DRAGON-SLAYER:</font> You can edit the new config file after the next relog.');
                }
				
                break;
		}
		return settings;
	}
}