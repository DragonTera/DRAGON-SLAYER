'use strict'

/*
# 0 = Finished
# 1 = Cancel (lockon)
# 2 = Cancel (movement/etc.)
# 3 = Special Interrupt (ex. Lancer: Shield Counter)
# 4 = Chain
# 5 = Retaliate
# 6 = Interrupt
# 10 = Button Release
# 11 = Button Release + Chain (ex. Mystic: Corruption Ring)
# 13 = Out of Stamina
# 19 = Invalid Target
# 25 = Unknown (ex. Command: Recall)
# 29 = Interrupted by Terrain (ex. entering water)
# 36 = Lockon Cast
# 37 = Interrupted by Loading
# 39 = Dash Finished
# 43 = Interrupted by Cutscene
# 49 = Unknown (HB uses this for Recall)
# 51 = Finished + Button Release (ex. Brawler: Counter)
*/

const SettingsUI = require('tera-mod-ui').Settings;

const TAG = "<font color='#04ACEC'>DRAGON-SLAYER:</font> ";

const JOB_SLAYER            = 2;

const MEASURED_SLICE        = 0;
const PUNISHING_BLOW        = 1;
const HEADLONG_RUSH         = 2;
const WHIRLWIND             = 3;
const OVERHAND_STRIKE       = 4;

const S_MEASURED_SLICE_0    = 230900;
const S_MEASURED_SLICE_1    = 230930;

const S_PUNISHING_BLOW_0    = 260100;
const S_PUNISHING_BLOW_1    = 260130;

const S_HEADLONG_RUSH       = 170300;

const S_WHIRLWIND_0         = 31100;
const S_WHIRLWIND_1         = 31101;
const S_WHIRLWIND_2         = 31102;
const S_WHIRLWIND_3         = 31130;

const S_OVERHAND_STRIKE_0   = 81000;
const S_OVERHAND_STRIKE_1   = 81030;

const S_SAVAGE_STRIKE_0     = 270100;
const S_SAVAGE_STRIKE_1     = 270130;
const S_SAVAGE_STRIKE_2     = 270131;

const S_OVERPOWER           = 180200;

module.exports = function slayer(mod)
{
    mod.game.initialize(['me', 'me.abnormalities']);

    let job         = null;
    let model       = null;
    let playerLoc   = null;
    let playerDest  = null;
    let playerW     = null;

    let mySpeed     = null;

    let atkIdBase   = 0xFEFEFFEE;
    let atkId       = [];
    let skillFinish = [true, true, true, true, true];
    let skillCd     = [false, false, false, false, false];
    let taskSkillCd = [null, null, null, null, null];

    let taskMs      = null;
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  functions
    //--------------------------------------------------------------------------------------------------------------------------------------
    
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

    function _SkillTarget(__event, __skill)
    {
        mod.toServer('C_START_TARGETED_SKILL', 7,
        {
            skill: __skill,
            w: __event.w,
            loc: __event.loc,
            dest: __event.dest,
            targets: [[0, 0]],
        });

        return;
    }

    function _SkillStage(__event, __skill, __atkId, __stage)
    {
        mod.toServer('S_ACTION_STAGE', 9, 
        {
            gameId: mod.game.me.gameId,
            loc: playerLoc,
            w: playerW,
            templateId: model,
            skill: __skill,
            stage: __stage,
            speed: mySpeed,
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
            templateId: __event.templateId,
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
            message: "Overpoer is not active.",
        });

        return;
    }

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Player event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_LOGIN', mod.majorPatchVersion < 114 ? 14 : 15, (event) => 
    {
        model    = event.templateId;
        job      = (model -10101) % 100;

        if(job != JOB_SLAYER){return;}
        
        setTimeout(function (){mod.command.message('This mod does not work with NGSP, SP or any skill prediction / ping remover.');}, 10000);

        skillFinish = [true, true, true, true, true];
        skillCd     = [false, false, false, false, false];
        taskSkillCd = [null, null, null, null, null];
        
        return;
    });

    mod.hook("C_PLAYER_LOCATION", 5, event =>
    {
		playerLoc   = event.loc;
		playerW     = event.w;
        playerDest  = event.dest;
	});

    mod.hook('S_PLAYER_STAT_UPDATE', mod.majorPatchVersion < 105 ? 14 : (mod.majorPatchVersion < 108 ? 15 : 17), (event) =>
    {
        if(job != JOB_SLAYER || mod.settings.ENABLE == false){return;}

        mySpeed = (event.attackSpeedBonus + event.attackSpeed) / event.attackSpeed;

        return;
    });

    mod.game.on('leave_game', () => 
    {
        clearInterval(taskMs);
    });
    
    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Cooldown skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_START_COOLTIME_SKILL', mod.majorPatchVersion < 114 ? 3 : 4, (event) =>
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_START_COOLTIME_SKILL: ' + event.skill.id + ' / ' + event.cooldown);}

        if(event.skill.id == S_MEASURED_SLICE_0)
        {
            skillCd[MEASURED_SLICE] = true;
            clearInterval(taskSkillCd[MEASURED_SLICE]);
            taskSkillCd[MEASURED_SLICE] = setTimeout(function (){skillCd[MEASURED_SLICE] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_PUNISHING_BLOW_0 || event.skill.id == S_PUNISHING_BLOW_1)
        {
            skillCd[PUNISHING_BLOW] = true;
            clearInterval(taskSkillCd[MEASURED_SLICE]);
            taskSkillCd[PUNISHING_BLOW] = setTimeout(function (){skillCd[PUNISHING_BLOW] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_HEADLONG_RUSH)
        {
            skillCd[HEADLONG_RUSH] = true;
            clearInterval(taskSkillCd[HEADLONG_RUSH]);
            taskSkillCd[HEADLONG_RUSH] = setTimeout(function (){skillCd[HEADLONG_RUSH] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_WHIRLWIND_0)
        {
            skillCd[WHIRLWIND] = true;
            clearInterval(taskSkillCd[WHIRLWIND]);
            taskSkillCd[WHIRLWIND] = setTimeout(function (){skillCd[WHIRLWIND] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_OVERHAND_STRIKE_0)
        {
            skillCd[OVERHAND_STRIKE] = true;
            clearInterval(taskSkillCd[OVERHAND_STRIKE]);
            taskSkillCd[OVERHAND_STRIKE] = setTimeout(function (){skillCd[OVERHAND_STRIKE] = false;}, event.cooldown);
        }

        return;
	});

    mod.hook('S_DECREASE_COOLTIME_SKILL', 3, (event) => 
    {
        if(job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_DECREASE_COOLTIME_SKILL: ' + event.skill.id + ' | ' + event.cooldown);}

        if(event.skill.id == S_MEASURED_SLICE_0)
        {
            skillCd[MEASURED_SLICE] = true;
            clearInterval(taskSkillCd[MEASURED_SLICE]);
            taskSkillCd[MEASURED_SLICE] = setTimeout(function (){skillCd[MEASURED_SLICE] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_PUNISHING_BLOW_0 || event.skill.id == S_PUNISHING_BLOW_1)
        {
            skillCd[PUNISHING_BLOW] = true;
            clearInterval(taskSkillCd[MEASURED_SLICE]);
            taskSkillCd[PUNISHING_BLOW] = setTimeout(function (){skillCd[PUNISHING_BLOW] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_HEADLONG_RUSH)
        {
            skillCd[HEADLONG_RUSH] = true;
            clearInterval(taskSkillCd[HEADLONG_RUSH]);
            taskSkillCd[HEADLONG_RUSH] = setTimeout(function (){skillCd[HEADLONG_RUSH] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_WHIRLWIND_0)
        {
            skillCd[WHIRLWIND] = true;
            clearInterval(taskSkillCd[WHIRLWIND]);
            taskSkillCd[WHIRLWIND] = setTimeout(function (){skillCd[WHIRLWIND] = false;}, event.cooldown);
        }
        else if(event.skill.id == S_OVERHAND_STRIKE_0)
        {
            skillCd[OVERHAND_STRIKE] = true;
            clearInterval(taskSkillCd[OVERHAND_STRIKE]);
            taskSkillCd[OVERHAND_STRIKE] = setTimeout(function (){skillCd[OVERHAND_STRIKE] = false;}, event.cooldown);
        }

        return;
	});

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Use skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('C_START_SKILL', 7, (event) =>
    {
        if(job != JOB_SLAYER || mod.settings.ENABLE == false){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'C_START_SKILL: ' + event.skill.id);}

        if(event.skill.id != S_OVERPOWER && mod.settings.OVERPOWER_NOTIFY == true)
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

        if(event.skill.id == S_MEASURED_SLICE_0 || event.skill.id == S_MEASURED_SLICE_1)
        {
            if(skillCd[PUNISHING_BLOW] == false && mod.settings.FORCE_PUNISHING_BLOW == true)
            {
                skillFinish[PUNISHING_BLOW] = false;
                skillFinish[MEASURED_SLICE]  = false;
                
                _SkillStart(event, S_PUNISHING_BLOW_0, true);
                
                if(mod.settings.AUTO_MEASURED_SLICE)
                {
                    clearInterval(taskMs);
                    taskMs = setInterval(function ()
                    {
                        if(skillFinish[PUNISHING_BLOW] == true || skillFinish[MEASURED_SLICE] == true)
                        {
                            clearInterval(taskMs);
                            return;
                        }
                        else if(skillCd[PUNISHING_BLOW] == true)
                        {
                            _SkillStart(event, S_MEASURED_SLICE_0, true);
                        }
                    }, 20);
                }
            }
        }
        else if(event.skill.id == S_WHIRLWIND_0 || event.skill.id == S_WHIRLWIND_1 || event.skill.id == S_WHIRLWIND_2 || event.skill.id == S_WHIRLWIND_3)
        {
            if(skillCd[HEADLONG_RUSH] == false && mod.settings.FORCE_HEADLONG_RUSH)
            {
                _SkillTarget(event, S_HEADLONG_RUSH);
                setTimeout(function (){_SkillStart(event, event.skill.id, true);}, 50 / mySpeed);
            }
        }
        else if(event.skill.id == S_OVERHAND_STRIKE_0 || event.skill.id == S_OVERHAND_STRIKE_1)
        {
            atkId[OVERHAND_STRIKE] = atkIdBase--;

            _SkillStart(event, S_OVERHAND_STRIKE_0, true);
            _SkillStage(event, S_OVERHAND_STRIKE_1, atkId[OVERHAND_STRIKE], 0);
            _SkillEnd(event, atkId[OVERHAND_STRIKE], 4);
        }
        else if(event.skill.id == S_SAVAGE_STRIKE_0 || event.skill.id == S_SAVAGE_STRIKE_1 || event.skill.id == S_SAVAGE_STRIKE_2)
        {
            if(skillCd[HEADLONG_RUSH] == false)
            {
                skillCd[HEADLONG_RUSH] = true;
                clearInterval(taskSkillCd[HEADLONG_RUSH]);
                taskSkillCd[HEADLONG_RUSH] = setTimeout(function (){skillCd[HEADLONG_RUSH] = false;}, 1000);
            }
        }
        
        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  End skills event
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.hook('S_ACTION_END', 5, (event) =>
    {
        if(mod.game.me.gameId != event.gameId || job != JOB_SLAYER){return;}
        if(mod.settings.DEBUG){console.log(TAG + 'S_ACTION_END: ' + event.skill.id + ' | ' + event.type + ' | ' + event.id);}

        if(event.skill.id == S_MEASURED_SLICE_0 || event.skill.id == S_MEASURED_SLICE_1)
            skillFinish[MEASURED_SLICE] = true;

        else if(event.skill.id == S_PUNISHING_BLOW_0 || event.skill.id == S_PUNISHING_BLOW_1)
            skillFinish[PUNISHING_BLOW] = true;
        
        else if(event.skill.id == S_HEADLONG_RUSH)
            skillFinish[HEADLONG_RUSH] = true;
        
        else if(event.skill.id == S_WHIRLWIND_0 || event.skill.id == S_WHIRLWIND_1 || event.skill.id == S_WHIRLWIND_2 || event.skill.id == S_WHIRLWIND_3)
            skillFinish[WHIRLWIND] = true;
        
        else if(event.skill.id == S_OVERHAND_STRIKE_0 || event.skill.id == S_OVERHAND_STRIKE_1)
            skillFinish[OVERHAND_STRIKE] = true;

        return;
    });

    //--------------------------------------------------------------------------------------------------------------------------------------
    //  Interface
    //--------------------------------------------------------------------------------------------------------------------------------------

    mod.command.add(['slayer'], () =>
    {
        if(ui){ui.show();}
    });

    let ui = null;
    if(global.TeraProxy.GUIMode)
    {
        ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, {height: 320, width: 700});
        
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