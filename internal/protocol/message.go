package protocol

import (
	"fmt"
	"strconv"
	"strings"
)

const (
	ControlChannel     = "__shadow_control__"
	EncryptedChannel   = "__shadow_e2e__"
	ReadOnlyJoinersKey = "read_only_joiners"
	PeerCountKey       = "peer_count"
)

func EncodeControlReadOnlyJoiners(enabled bool) []byte {
	value := "0"
	if enabled {
		value = "1"
	}
	return []byte(fmt.Sprintf("%s|%s=%s", ControlChannel, ReadOnlyJoinersKey, value))
}

func ParseReadOnlyJoinersControl(payload string) (bool, bool) {
	key, value, ok := strings.Cut(payload, "=")
	if !ok || key != ReadOnlyJoinersKey {
		return false, false
	}

	n, err := strconv.Atoi(value)
	if err != nil {
		return false, false
	}
	return n == 1, true
}

func EncodeControlPeerCount(count int) []byte {
	return []byte(fmt.Sprintf("%s|%s=%d", ControlChannel, PeerCountKey, count))
}

func ParsePeerCountControl(payload string) (int, bool) {
	key, value, ok := strings.Cut(payload, "=")
	if !ok || key != PeerCountKey {
		return 0, false
	}
	n, err := strconv.Atoi(value)
	if err != nil {
		return 0, false
	}
	return n, true
}
