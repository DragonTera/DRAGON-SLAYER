'use strict'

const SettingsUI = require('tera-mod-ui').Settings;

const TAG = "<font color='#04ACEC'>DRAGON-SLAYER:</font> ";

const DEBUG                 = false;

const JOB_SLAYER            = 2;

const S_COMBO_ATTACK_0      = 11200;    //BLACK LIST
const S_COMBO_ATTACK_1      = 11201;    //BLACK LIST
const S_COMBO_ATTACK_2      = 11202;    //BLACK LIST
const S_COMBO_ATTACK_3      = 11203;    //BLACK LIST

const S_KNOCKDOWN_STRIKE_0  = 21100;
const S_KNOCKDOWN_STRIKE_1  = 21101;
const S_KNOCKDOWN_STRIKE_2  = 21102;    //SAVAGE INDICATOR
const S_KNOCKDOWN_STRIKE_3  = 21130;    //MAX SPEED

const S_WHIRLWIND_0         = 31100;
const S_WHIRLWIND_1         = 31101;
const S_WHIRLWIND_2         = 31102;    //SAVAGE INDICATOR
const S_WHIRLWIND_3         = 31130;    //MAX SPEED

const S_EVASIVE_ROLL_0      = 40200;    //BLACK LIST
const S_EVASIVE_ROLL_1      = 40230;    //BLACK LIST

const S_DASH                = 50300;

const S_BACKSTAB            = 60200;    //BLACK LIST

const S_OVERHAND_STRIKE_0   = 81000;
const S_OVERHAND_STRIKE_1   = 81030;    //MAX SPEED

const S_LEAPING_STRIKE      = 90800;

const S_HEART_THRUST_0      = 121100;
const S_HEART_THRUST_1      = 121101;
const S_HEART_THRUST_2      = 121102;   //SAVAGE INDICATOR
const S_HEART_THRUST_3      = 121130;   //MAX SPEED

const S_STUNNING_BACKHAND   = 130900;

const S_DISTANT_BLADE_0     = 140800;   //BLACK LIST
const S_DISTANT_BLADE_1     = 140801;   //BLACK LIST
const S_DISTANT_BLADE_2     = 140802;   //BLACK LIST

const S_STARTLING_KICK      = 150800;

const S_FURY_STRIKE         = 160400;

const S_HEADLONG_RUSH       = 170300;

const S_OVERPOWER_0         = 180200;
const S_OVERPOWER_1         = 180250;

const S_TENACITY_0          = 190300;
const S_TENACITY_1          = 193300;   //IMORTAL

const S_IN_COLD_BLOOD_0     = 200300;   //BLACK LIST
const S_IN_COLD_BLOOD_1     = 203200;   //BLACK LIST

const S_EXHAUSTING_BLOW     = 210100;

const S_MEASURED_SLICE_0    = 230900;
const S_MEASURED_SLICE_1    = 230930;   //MAX SPEED

const S_EVISCERATE_0        = 240900;
const S_EVISCERATE_1        = 240930;   //MAX SPEED

const S_PUNISHING_BLOW_0    = 260100;
const S_PUNISHING_BLOW_1    = 260130;   //MAX SPEED

const S_SAVAGE_STRIKE_0     = 270100;   //BLACK LIST
const S_SAVAGE_STRIKE_1     = 270130;   //BLACK LIST
const S_SAVAGE_STRIKE_2     = 270131;   //BLACK LIST

const S_UNSHEATHE_0         = 280100;   //BLACK LIST
const S_UNSHEATHE_1         = 280101;   //BLACK LIST
const S_UNSHEATHE_2         = 280102;   //BLACK LIST
const S_UNSHEATHE_3         = 280103;   //BLACK LIST

const WHITE_LIST            = [11200, 11201, 11202, 11203, 21100, 21101, 21102, 21130, 31100, 31101, 31102, 31130, 40200, 40230, 50300, 60200, 81000, 81030,90800,
                               121100, 121101, 121102, 121130, 130900, 140800, 140801, 140802, 150800, 160400, 170300, 180200, 180250, 190300, 193300, 200300, 203200,
                               210100, 230900, 230930, 240900, 240930, 260100, 260130, 270100, 270130, 270131, 280100, 280101, 280102, 280103];

module.exports = function slayer(mod)
{
    mod.game.initialize(['me', 'me.abnormalities']);

    let job          = (mod.game.me.templateId - 10101) % 100;
    let playerLoc    = null;
    let playerDest   = null;
    let playerW      = null;
    let playerSpeed  = 1;
    let playerMoving = false;

    let ConfigReload = false;

    let atkIdBase    = 0xFEFEFFEE;

    let skillFinish  = [];
    let skillCd      = [];
    let skillCdTask  = [];
    let skillBefore  = 0;
    let SavageCount  = 4;
    let OhsCount     = 0;

    let taskMs       = null;
    let taskWw       = null;
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  functions
    //--------------------------------------------------------------------------------------------------------------------------------------
    
    function _SkillTarget(__event, __skill)
    {
        mod.toServer('C_START_TARGETED_SKILL', 7, 
        {
            skill: __skill,
            skill:
            { 
                npc: false,
                type: 1, 
                huntingZoneId: 0, 
                id : __skill,
                reserved: 0
            },
            w: __event.w,
            loc: __event.loc,
            dest: __event.dest,
            targets: 
            [{
                gameId: __event.target,
                hitCylinderId: 0
            }],
        });

        return;
    }

    function _SkillStart(__event, __skill, __continue)
    {
        mod.toServer('C_START_SKILL', 7,
        {
            skill: __skill,
            w: __event.w,
            loc: __event.loc,
            dest: __event.dest,
            unk: true,
            moving: __event.moving,
            continue: __continue,
            target: __event.target,
        });
    
        return;
    }

    function _SkillCannotStart(__skill)
    {
        mod.send('S_CANNOT_START_SKILL', 4,
        {
            skill: __skill
        });
    
        return;
    }

    function _SkillStage(__event, __skill, __atkId, __stage)
    {
        mod.toServer('S_ACTION_STAGE', 9, 
        {
            gameId: mod.game.me.gameId,
            loc: __event.loc,
            w: __event.w,
            templateId: mod.game.me.templateId,
            skill: __skill,
            stage: __stage,
            speed: playerSpeed,
            ...(mod.majorPatchVersion >= 75 ? { projectileSpeed: 1 } : 0n),
            id: __atkId,
            effectScale: 1.0,
            moving: __event.moving,
            dest: __event.dest,
            target: 0n,
            animSeq: [],
        });

        return;
    }

    function _SkillEnd(__event, __atkId, __type)
    {
        mod.toServer('S_ACTION_END', 5, 
        {
            gameId: mod.game.me.gameId,
            loc: __event.loc,
            w: __event.w,
            templateId: mod.game.me.templateId,
            skill: __event.skill,
            type: __type,
            id: __atkId,
        });
        
        return;
    }

    function _Wisper()
    {
        mod.toClient('S_WHISPER', 3,
        {
            gameId: mod.game.me.gameId,
            isWorldEventTarget: 0,
            gm: 0,
            founder: 0,
            name: "DRAGON_SLAYER",
            recipient: mod.game.me.name,
            message: "Overpower is not active.",
        });

        return;
    }

    function _SkillNumber(__id)
    {
        return Math.floor(__id / 10000);
    }

    function _SkillReset()
    {
        for(let __i = 0; __i < 50; __i++)
        {
            clearInterval(skillCdTask[__i]);
            skillFinish[__i] = true;
            skillCd[__i]     = false;
            skillCdTask[__i] = null;
        }

        clearInterval(taskMs);
        clearInterval(taskWw);
        skillBefore = 0;
        SavageCount = 4;
        OhsCount    = 0;

        return;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Player event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_LOGIN', mod.majorPatchVersion < 114 ? 14 : 15, {order: -Infinity}, (event) => 
    {
        job = (mod.game.me.templateId - 10101) % 100;
        
        _SkillReset();
        ConfigReload = true;
        
        return;
    });

    mod.hook("C_PLAYER_LOCATION", 5, {order: -Infinity}, event =>
    {
        job         = (mod.game.me.templateId - 10101) % 100;
		playerLoc   = event.loc;
		playerW     = event.w;
        playerDest  = event.dest;

        if(ConfigReload == false)
        {
            _SkillReset();
            ConfigReload = true;
        }

        return;
	});

    mod.hook('S_PLAYER_STAT_UPDATE', mod.majorPatchVersion < 105 ? 14 : (mod.majorPatchVersion < 108 ? 15 : 17), {order: -Infinity}, (event) =>
    {
        if(job != JOB_SLAYER || mod.settings.ENABLE == false){return;}

        playerSpeed = (event.attackSpeedBonus + event.attackSpeed) / event.attackSpeed;

        return;
    });

    mod.game.on('leave_game', () => 
    {
        _SkillReset();

        return;
    });
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Cooldown skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_START_COOLTIME_SKILL', mod.majorPatchVersion < 114 ? 3 : 4, {order: -Infinity}, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'S_START_COOLTIME_SKILL: ' + event.skill.id + ' / ' + event.cooldown);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillCd[_SkillNumber(event.skill.id)] = true;
        clearInterval(skillCdTask[_SkillNumber(event.skill.id)]);
        skillCdTask[_SkillNumber(event.skill.id)] = setTimeout(function (){skillCd[_SkillNumber(event.skill.id)] = false;}, event.cooldown);

        return;
	});

    mod.hook('S_DECREASE_COOLTIME_SKILL', 3, {order: -Infinity}, (event) => 
    {
        if(job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'S_DECREASE_COOLTIME_SKILL: ' + event.skill.id + ' / ' + event.cooldown);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillCd[_SkillNumber(event.skill.id)] = true;
        clearInterval(skillCdTask[_SkillNumber(event.skill.id)]);
        skillCdTask[_SkillNumber(event.skill.id)] = setTimeout(function (){skillCd[_SkillNumber(event.skill.id)] = false;}, event.cooldown);

        return;
	});

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Use skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('C_START_SKILL', 7, {order: -99}, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'C_START_SKILL: ' + event.skill.id);}
        if(mod.settings.ENABLE == false){return;}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillFinish[_SkillNumber(event.skill.id)] = false;

        if(_SkillNumber(event.skill.id) != _SkillNumber(S_OVERHAND_STRIKE_0)){OhsCount = 0;}

        playerMoving = event.moving;

        let returnType = true;
        
        if(_SkillNumber(event.skill.id) != _SkillNumber(S_OVERPOWER_0) && mod.settings.OVERPOWER_NOTIFY == true)
        {
            let __wisper = true;

            Object.values(mod.game.me.abnormalities).forEach(abnormality => 
            {
                if(abnormality.data.name == "Overpowered")
                {
                    __wisper = false;
                    return;
                }
            });
            
            if(__wisper == true){_Wisper();}
        }
        
        if(_SkillNumber(event.skill.id) != _SkillNumber(S_OVERHAND_STRIKE_0))
        {
            SavageCount++;
        }

        if(_SkillNumber(event.skill.id) == _SkillNumber(S_WHIRLWIND_0))
        {
            if(skillCd[_SkillNumber(S_HEADLONG_RUSH)] == false && mod.settings.FORCE_HEADLONG_RUSH == true && SavageCount > 3)
            {
                _SkillCannotStart(event.skill);

                setTimeout(function ()
                {
                    _SkillTarget(event, S_HEADLONG_RUSH);

                    setTimeout(function ()
                    {
                        setTimeout(function ()
                        {
                            if(mod.settings.AUTO_MEASURED_SLICE == true)
                            {
                                clearInterval(taskWw);
                                taskWw = setInterval(function ()
                                {
                                    if(skillFinish[_SkillNumber(S_HEADLONG_RUSH)] == true || skillFinish[_SkillNumber(S_WHIRLWIND_0)] == true)
                                    {
                                        clearInterval(taskWw);
                                        return;
                                    }
                                    else
                                    {
                                        _SkillStart(event, event.skill, true);
                                    }
                                }, 20);
                            }
                        }, 10);
                    }, 50);
                }, 10);
                
                returnType = false;
            }
        }
        else if(_SkillNumber(event.skill.id) == _SkillNumber(S_OVERHAND_STRIKE_0))
        {
            OhsCount++;

            if(mod.settings.OVERHAND == true)
            {
                if(OhsCount > 3)
                {
                    _SkillCannotStart(event.skill);
                    returnType = false;
                }
                else
                {
                    atkIdBase--;
                    
                    if(atkIdBase < 100){atkIdBase = 0xFEFEFFEE;}
                    
                    _SkillStart(event, S_OVERHAND_STRIKE_0, true);
                    _SkillStage(event, S_OVERHAND_STRIKE_1, atkIdBase, 0);
                    _SkillEnd(event, atkIdBase, 4);
                }
            }
        }
        else if(_SkillNumber(event.skill.id) == _SkillNumber(S_MEASURED_SLICE_0))
        {
            if(skillCd[_SkillNumber(S_PUNISHING_BLOW_0)] == false && mod.settings.FORCE_PUNISHING_BLOW == true)
            {
                skillFinish[_SkillNumber(S_PUNISHING_BLOW_0)] = false;

                _SkillCannotStart(event.skill);

                setTimeout(function ()
                {
                    let __event      = event;
                    __event.skill.id = S_PUNISHING_BLOW_0;

                    _SkillStart(__event, __event.skill, true);
                    
                    if(mod.settings.AUTO_MEASURED_SLICE == true)
                    {
                        clearInterval(taskMs);
                        taskMs = setInterval(function ()
                        {
                            if(skillFinish[_SkillNumber(S_PUNISHING_BLOW_0)] == true || skillFinish[_SkillNumber(S_MEASURED_SLICE_0)] == true)
                            {
                                clearInterval(taskMs);
                                return;
                            }
                            else if(skillCd[_SkillNumber(S_PUNISHING_BLOW_0)] == true)
                            {
                                __event.skill.id = S_MEASURED_SLICE_0;
                                _SkillStart(__event, __event.skill, true);
                            }
                        }, 20);
                    }
                }, 10);

                returnType = false;
            }
        }
        else if(_SkillNumber(event.skill.id) == _SkillNumber(S_SAVAGE_STRIKE_0))
        {
            if(skillCd[_SkillNumber(S_HEADLONG_RUSH)] == false)
            {
                skillCd[_SkillNumber(S_HEADLONG_RUSH)] = true;
                clearInterval(skillCdTask[_SkillNumber(S_HEADLONG_RUSH)]);
                skillCdTask[_SkillNumber(S_HEADLONG_RUSH)] = setTimeout(function (){skillCd[_SkillNumber(S_HEADLONG_RUSH)] = false;}, 1000 * playerSpeed);
            }

            SavageCount = 0;
        }

        skillBefore = _SkillNumber(event.skill.id);

        return returnType;
    });

    mod.hook('C_PRESS_SKILL', 4, {order: -Infinity}, (event) => 
    {
        if(job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'C_PRESS_SKILL: ' + event.skill.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        return;
	});

    mod.hook('C_START_INSTANCE_SKILL', 7, {order: -Infinity}, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'C_START_INSTANCE_SKILL: ' + event.skill.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        return;
    });

    mod.hook('S_ACTION_STAGE', 9, {order: -Infinity}, (event) =>
    {
        if(mod.game.me.gameId != event.gameId || job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'S_ACTION_STAGE: ' + event.skill.id + ' | ' + event.stage);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        if(_SkillNumber(event.skill.id) == _SkillNumber(S_SAVAGE_STRIKE_0))
        {
            if(mod.settings.SAVAGE_STRIKE_CANCEL_AWSD == true && playerMoving == true)
            {

            }
            else if(mod.settings.SAVAGE_STRIKE_DOUBLE == true && (event.skill.id == S_SAVAGE_STRIKE_0 || event.skill.id == S_SAVAGE_STRIKE_1))
            {
                let __event     = event;
                __event.loc     = event.dest;
                __event.skill   = S_SAVAGE_STRIKE_0;
                __event.w       = __event.w > 0 ? __event.w - Math.PI : __event.w + Math.PI;

                setTimeout(function ()
                {
                   _SkillStart(__event, __event.skill, true);
                }, mod.settings.SAVAGE_STRIKE_DELAY * playerSpeed);
            }
        }

        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  End skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_ACTION_END', 5, {order: -Infinity}, (event) =>
    {
        if(mod.game.me.gameId != event.gameId || job != JOB_SLAYER){return;}
        if(DEBUG == true){console.log(TAG + 'S_ACTION_END: ' + event.skill.id + ' | ' + event.type + ' | ' + event.id);}
        if(WHITE_LIST.includes(event.skill.id) == false){return;}

        skillFinish[_SkillNumber(event.skill.id)] = true;

        if(_SkillNumber(event.skill.id) == _SkillNumber(S_OVERHAND_STRIKE_0))
        {
            SavageCount++;
        }
        else if(_SkillNumber(event.skill.id) == _SkillNumber(S_SAVAGE_STRIKE_0))
        {
            SavageCount = 0;
        }

        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Interface
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.command.add(['slayer'], () =>
    {
        if(ui){ui.show();}

        return;
    });

    let ui = null;
    if(global.TeraProxy.GUIMode)
    {
        ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, {height: require('./settings_structure').length * 35, width: 735});
        
        ui.on('update', settings => 
        {
            mod.settings = settings;
        });

        this.destructor = () => 
        {
            if(ui)
            {
                ui.close();
                ui = null;
            }
        };
    }
}